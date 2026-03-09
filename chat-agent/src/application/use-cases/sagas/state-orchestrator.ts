import { FMStatus } from "@/domain/booking";
import { BookingSagaResult, reservationSaga } from "./booking/booking-saga";
import type { DomainCtx } from "@/domain/booking";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import type {
  StartedFuncSagaResult,
  ValidateFuncSagaResult,
} from "./booking/steps";
import { formatSagaOutput, SagaOrchestrator } from "@/application/patterns";
import { InputType } from "@/domain/booking/input-parser";
import { conversationalWorkflow } from "./conversational-workflow";
import {
  aiAdapter,
  ChatMessage,
  ToolCall,
} from "@/infraestructure/adapters/ai";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { ragService } from "@/application/services/rag";
import { createProductOrderSystemPrompt } from "@/application/services/rag";

const MAX_WORDS = 60;

const bookingSagaMap: Partial<
  Record<FMStatus, StartedFuncSagaResult | ValidateFuncSagaResult>
> = {
  MAKE_STARTED: reservationSaga.makeStarted,
  MAKE_VALIDATED: reservationSaga.makeValidated,

  UPDATE_STARTED: reservationSaga.updateStarted,
  UPDATE_VALIDATED: reservationSaga.updateValidated,

  CANCEL_VALIDATED: reservationSaga.cancelValidated,
};

/**
 * Tool executor type
 */
type ToolExecutor = (args: {
  name: string;
  arguments: Record<string, unknown>;
  ctx: DomainCtx;
}) => Promise<string>;

/**
 * Creates a tool executor for product order tools
 * @visibleForTesting
 */
export const createProductOrderToolExecutor =
  (ctx: DomainCtx): ToolExecutor =>
  async ({ name, arguments: args }) => {
    const businessId = ctx.businessId;

    switch (name) {
      case "search_products": {
        const description = args.description as string;
        if (!description) {
          return JSON.stringify({
            error: "Missing required parameter: description",
          });
        }
        const results = await ragService.searchProducts(
          description,
          businessId,
          3,
        );
        return JSON.stringify(
          {
            products: results.points?.map((p) => ({
              name: p.payload?.name,
              description: p.payload?.description,
              price: p.payload?.price,
              enabled: p.payload?.enabled,
            })),
          },
          null,
          2,
        );
      }

      case "get_menu": {
        const category = args.description as string | undefined;
        const results = await ragService.searchBusinessMedia(
          category || "menú completo",
          businessId,
          3,
        );
        return JSON.stringify(
          {
            menuItems: results.points?.map((p) => ({
              url: p.payload?.url,
            })),
          },
          null,
          2,
        );
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  };

/**
 * Processes tool calls and returns formatted results for the LLM
 * @visibleForTesting
 */
export const processToolCalls = async (
  toolCalls: ToolCall[],
  executor: ToolExecutor,
  ctx: DomainCtx,
): Promise<ChatMessage[]> => {
  const results: ChatMessage[] = [];

  for (const toolCall of toolCalls) {
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      console.error("[StateOrchestrator] Failed to parse tool arguments:", {
        toolName: toolCall.function.name,
        arguments: toolCall.function.arguments,
        error,
      });
      parsedArgs = {};
    }

    const result = await executor({
      name: toolCall.function.name,
      arguments: parsedArgs,
      ctx,
    });

    results.push({
      role: "tool",
      content: result,
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
    });
  }

  return results;
};

/**
 *
 * @param ctx
 * @returns
 */
export const stateOrchestrator = async (
  ctx: DomainCtx,
): Promise<BookingSagaResult> => {
  //
  const bookingStatus = ctx.bookingState?.status;
  const productOrdeStatus = ctx.productOrderState?.status;
  const business = ctx.business;
  const message = ctx.customerMessage;
  const words = message.split(" ");

  if (words.length > MAX_WORDS) {
    return formatSagaOutput(
      `Por favor resume tu consulta en máximo ${MAX_WORDS} palabras. 😊`,
      "MAX_WORDS_REACHED",
    );
  }
  if (!business.general.isActive) {
    return formatSagaOutput(
      "El negocio está fuera de servicio, por favor inténtalo más tarde.",
      "OUT_OF_SERVICE",
    );
  }
  if (bookingStatus) {
    // ============================================
    // 2.DETERMINISTIC SAGA ORCHESTRATOR
    // For every workflow option there is a FSM transition
    // ============================================
    const sagaOrchestrator = bookingSagaMap[bookingStatus];
    if (!sagaOrchestrator) {
      throw new Error(`No saga found for status ${bookingStatus}`);
    }
    const { lastStepResult, bag } = await sagaOrchestrator(ctx);
    const result =
      lastStepResult?.execute?.result ||
      lastStepResult?.compensate?.result ||
      "";
    if (result && result !== InputType.INFORMATION_REQUEST) {
      await chatHistoryAdapter.push(ctx.chatKey, message, result);
      return { bag, lastStepResult };
    }
  }

  const domain: SpecializedDomain = ctx.business.general.businessType;

  if (productOrdeStatus) {
    const systemPrompt = createProductOrderSystemPrompt(domain);
    const toolExecutor = createProductOrderToolExecutor(ctx);

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "search_products",
          description: "Search for products by name or description similarity.",
          parameters: {
            type: "object" as const,
            properties: {
              description: {
                type: "string",
                description: "Product description to search for",
              },
            },
            required: ["description"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "get_menu",
          description: "Get menu items by category or full menu.",
          parameters: {
            type: "object" as const,
            properties: {
              description: {
                type: "string",
                description: "Category filter (optional)",
              },
            },
            additionalProperties: false,
          },
        },
      },
    ];

    const result = await aiAdapter.generateTextWithTools({
      messages,
      tools,
    });

    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log("[StateOrchestrator] Tool calls:", result.toolCalls.length);

      const toolResults = await processToolCalls(
        result.toolCalls,
        toolExecutor,
        ctx,
      );
      messages.push(...toolResults);

      const finalResponse = await aiAdapter.generateText({
        messages,
        tools,
      });

      return formatSagaOutput(finalResponse);
    }

    return formatSagaOutput(result.content);
  }

  // ============================================
  // 1. POMDP (heuristic-light-pragmatic) entry point
  // ============================================
  return conversationalWorkflow(ctx);
};
