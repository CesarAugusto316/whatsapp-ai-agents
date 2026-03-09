import {
  ToolCall,
  ChatMessage,
  ToolDefinition,
} from "./open-ai-compatible.types";
import { DomainCtx } from "@/domain/booking";
import { ragService } from "@/application/services/rag";
import aiAdapter from "./ai.adapter";
import { formatSagaOutput } from "@/application/patterns";
import { createProductOrderSystemPrompt } from "@/application/services/rag/product-order-prompt";
import { BookingSagaResult } from "@/application/use-cases/sagas/booking/booking-saga";
import { SpecializedDomain } from "../cms";
import { chatHistoryAdapter } from "../cache";

/**
 * Tools predefinidos para pedidos de productos
 */
const PRODUCT_ORDER_TOOLS: ToolDefinition[] = [
  {
    type: "function" as const,
    function: {
      name: "search_products",
      description: "Search for products by name or description.",
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
] as const;

/**
 * Ejecuta una herramienta específica
 */
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  businessId: string,
): Promise<string> {
  switch (name) {
    case "search_products": {
      const description = args.description as string;
      if (!description) {
        return JSON.stringify({ error: "Missing description" });
      }
      const results = await ragService.searchProducts(
        description,
        businessId,
        5,
      );
      return JSON.stringify({
        products: results.points
          ?.map((p) => ({
            name: p.payload?.name,
            description: p.payload?.description,
            price: p.payload?.price,
            enabled: p.payload?.enabled,
          }))
          .filter((p) => p.enabled),
      });
    }
    case "get_menu": {
      const category = args.description as string | undefined;
      const results = await ragService.searchBusinessMedia(
        category || "menu",
        businessId,
        3,
      );
      return JSON.stringify({
        menuItems: results.points?.map((p) => ({
          url: p.payload?.url,
          thumbnailURL: p.payload?.thumbnailURL,
        })),
      });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

/**
 * Procesa tool calls del LLM y ejecuta las herramientas
 */
async function processToolCalls(
  toolCalls: ToolCall[],
  businessId: string,
): Promise<ChatMessage[]> {
  return Promise.all(
    toolCalls.map(async (toolCall) => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(JSON.parse(toolCall.function.arguments));
      } catch {
        // Usar args vacíos si falla el parse
      }
      const result = await executeTool(
        toolCall.function.name,
        args,
        businessId,
      );
      return {
        role: "tool" as const,
        content: result,
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
      };
    }),
  );
}

/**
 * Maneja el flujo completo de tool calling para pedidos de productos
 */
export async function handleProductOrderWithTools(
  ctx: DomainCtx,
  userMessage: string,
): Promise<BookingSagaResult> {
  const domain: SpecializedDomain = ctx.business.general.businessType;
  const systemPrompt = createProductOrderSystemPrompt(domain);
  const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory ?? []),
    { role: "user", content: userMessage },
  ];

  const { toolCalls, content } = await aiAdapter.generateTextWithTools({
    useAuxModel: true,
    messages,
    tools: PRODUCT_ORDER_TOOLS,
  });

  console.log({ toolCalls, content });

  if (!toolCalls || toolCalls.length === 0) {
    await chatHistoryAdapter.push(ctx.chatKey, userMessage, content);
    return formatSagaOutput(content, "No tool calls", {
      toolCalls,
      systemPrompt,
    });
  }

  const toolResults = await processToolCalls(toolCalls, ctx.businessId);
  console.log({ toolResults });
  messages.push(...toolResults);

  const finalResponse = await aiAdapter.generateText({
    messages,
    // tools: PRODUCT_ORDER_TOOLS,
  });

  await chatHistoryAdapter.push(ctx.chatKey, userMessage, finalResponse);
  return formatSagaOutput(finalResponse, "tools called", {
    toolCalls,
    systemPrompt,
  });
}
