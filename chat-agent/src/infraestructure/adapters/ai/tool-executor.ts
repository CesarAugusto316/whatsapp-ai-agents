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
import { MediaFile } from "../whatsapp";

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
          limit: {
            type: "integer",
            description: "Maximum number of results to return (default: 5)",
          },
        },
        required: ["intent", "keywords", "limit"],
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
          keywords: {
            type: "string",
            description:
              "Specific product keywords to search for (e.g., 'menu de pizzas', 'menu')",
          },
          limit: {
            type: "integer",
            description: "Maximum number of results to return (default: 3)",
          },
        },
        required: ["intent", "limit"],
        additionalProperties: false,
      },
    },
  },
] as const;

type ToolResult = {
  success: boolean;
  tool: string;
  message: string;
  files: (MediaFile & { alt: string })[];
};

/**
 * Ejecuta una herramienta específica
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  businessId: string,
): Promise<ToolResult> {
  switch (name) {
    //
    case "search_products": {
      const keywords = args.keywords as string;
      const limit = Number(args.limit) || 5;
      // Usar keywords si está disponible, sino usar intent
      const results = await ragService.searchProducts(
        keywords,
        businessId,
        limit,
      );

      const products = results.points?.map(({ payload }) => ({
        ...payload,
        isAvailable: payload?.enabled,
      }));

      if (!products?.length) {
        return {
          success: false,
          tool: "search_products",
          message:
            "No se encontraron productos, se debe pedir alternativas al usuario",
          files: [],
        };
      }

      return {
        success: true,
        tool: "search_products",
        message: JSON.stringify({
          products,
        }),
        files: [],
      };
    }

    case "get_menu": {
      const intent = args.intent as string | undefined;
      const limit = Number(args.limit) || 3;
      const { points } = await ragService.searchBusinessMedia(
        intent || "menu",
        businessId,
        limit,
      );
      const files =
        points?.map((p) => ({
          filename: p.payload.filename ?? "",
          url: p.payload.url ?? "",
          mimetype: p.payload.mimeType ?? "",
          alt: p.payload.alt ?? "",
        })) ?? [];

      if (!files.length) {
        return {
          success: false,
          tool: "get_menu",
          message:
            "No se encontraron los archivos, se debe pedir alternativas al usuario",
          files: [],
        };
      }

      return {
        success: true,
        tool: "get_menu",
        message: "Menú encontrado, SUCCESS ✅",
        files,
      };
    }

    default:
      return {
        success: false,
        tool: "unknown_tool",
        message: JSON.stringify({ error: `Unknown tool: ${name}` }),
        files: [],
      };
  }
}

/**
 * Procesa tool calls del LLM y ejecuta las herramientas
 */
export async function processToolCalls(
  toolCalls: ToolCall[],
  businessId: string,
): Promise<(ToolResult & { chatMsg: ChatMessage })[]> {
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
        ...result,
        chatMsg: {
          role: "tool",
          content: result.message,
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
        } satisfies ChatMessage,
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
    response_format: { type: "json_object" },
  });
  console.log({ toolCalls });

  if (!toolCalls || toolCalls.length === 0) {
    await chatHistoryAdapter.push(ctx.chatKey, userMessage, content);
    return formatSagaOutput(content, "No tool calls", {
      toolCalls,
      systemPrompt,
    });
  }

  const toolResults = await processToolCalls(toolCalls, ctx.businessId);
  const files = [
    ...toolResults
      .filter((r) => r.files?.length)
      .map((r) => r.files)
      .flat(),
  ];

  messages.push(...toolResults.map((r) => r.chatMsg));

  const finalResponse = await aiAdapter.generateText({
    messages,
  });

  await chatHistoryAdapter.push(ctx.chatKey, userMessage, finalResponse);
  return formatSagaOutput(
    finalResponse,
    "tools called",
    {
      toolCalls,
      systemPrompt,
    },
    files,
  );
}
