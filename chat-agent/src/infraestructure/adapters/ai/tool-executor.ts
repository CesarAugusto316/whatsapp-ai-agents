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
 *
 * @link https://developers.openai.com/api/docs/guides/function-calling/?lang=javascript
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
          intent: {
            type: "string",
            description:
              "User's original intent that triggered this tool call (e.g., 'quiero ver el menú', 'busco platos con pollo', 'quiero pedir una pizza')",
          },
          keywords: {
            type: "string",
            description:
              "Specific product keywords to search for (e.g., 'pizza hawaiana', 'zapatos rojos', 'camisa azul')",
          },
        },
        required: ["intent", "keywords"],
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
          intent: {
            type: "string",
            description:
              "User's original intent that triggered this tool call (e.g., 'quiero ver el menú', '¿qué postres tienen?', 'muéstrame las opciones')",
          },
        },
        required: ["intent"],
        additionalProperties: false,
      },
    },
  },
] as const;

/**
 * Ejecuta una herramienta específica
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  businessId: string,
): Promise<string> {
  switch (name) {
    case "search_products": {
      const keywords = args.keywords as string;
      // Usar keywords si está disponible, sino usar intent
      const results = await ragService.searchProducts(keywords, businessId, 5);
      return JSON.stringify({
        products: results.points
          ?.map((p) => ({
            name: p.payload?.name,
            description: p.payload?.description,
            price: p.payload?.price,
            isAvailable: p.payload?.enabled,
            estimatedProcessingTime: p.payload?.estimatedProcessingTime,
          }))
          .filter((p) => p.isAvailable),
      });
    }
    case "get_menu": {
      const intent = args.intent as string | undefined;
      const { points } = await ragService.searchBusinessMedia(
        intent || "menu",
        businessId,
        3,
      );
      return JSON.stringify({
        menuItems: points?.map((p) => ({
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
export async function processToolCalls(
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
      // Extraer el intent del usuario de los argumentos del tool call
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
