import {
  ToolCall,
  ChatMessage,
  ToolDefinition,
} from "@/infraestructure/adapters/ai/open-ai-compatible.types";
import { DomainCtx } from "@/domain/booking";
import { ragService } from "@/application/services/rag";
import aiAdapter from "@/infraestructure/adapters/ai/ai.adapter";
import { formatSagaOutput } from "@/application/patterns";
import { BookingSagaResult } from "@/application/use-cases/sagas/booking/booking-saga";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { MediaFile } from "@/infraestructure/adapters/whatsapp";
import { createProductOrderSystemPrompt } from "@/application/use-cases/sagas/product-orders";
import { routerAgent } from "./router-agent";
import { cartAgent } from "./cart-agent";
import { productOrderStateManager } from "@/application/services/state-managers";

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
          keywords: {
            type: "string",
            description:
              "Specific product keywords to search for (e.g., 'pizza hawaiana', 'zapatos rojos', 'camisa azul')",
          },
        },
        required: ["keywords"],
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
          keywords: {
            type: "string",
            description:
              "Specific product keywords to search for (e.g., 'menu de pizzas', 'menu')",
          },
        },
        required: ["keywords"],
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
  orderKey?: string,
): Promise<ToolResult> {
  switch (name) {
    //
    case "search_products": {
      const keywords = (args.keywords as string) || "";
      const limit = 5;
      // Usar keywords si está disponible, sino usar intent
      const { points } = await ragService.searchProducts(
        keywords,
        businessId,
        limit,
      );

      await productOrderStateManager.addSearchedProducts(orderKey!, points);

      const products = points?.map(({ payload }) => ({
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
      const keywords = (args.keywords as string) || "menu";
      const limit = 3;
      const { points } = await ragService.searchBusinessMedia(
        keywords,
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
            "No se encontró el menú, se debe pedir alternativas al usuario",
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
  ctx: DomainCtx,
): Promise<(ToolResult & { chatMsg: ChatMessage })[]> {
  //
  const businessId = ctx.businessId;

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
        ctx.productOrderKey,
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
): Promise<BookingSagaResult> {
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;
  const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);

  // ----------------------------------------------------------
  // ROUTER AGENT
  // ----------------------------------------------------------
  const router = await routerAgent(ctx, chatHistory);

  // ----------------------------------------------------------
  // CART AGENT
  // ----------------------------------------------------------
  if (router === "cart") {
    return cartAgent(ctx, chatHistory);
  }

  // ----------------------------------------------------------
  // SEARCH AGENT
  // ----------------------------------------------------------
  const systemPrompt = createProductOrderSystemPrompt(domain);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory ?? []),
    { role: "user", content: userMessage },
  ];

  const { toolCalls, content } = await aiAdapter.generateTextWithTools({
    useAuxModel: true,
    messages,
    tools: PRODUCT_ORDER_TOOLS,
    response_format: { type: "json_schema" },
  });

  if (!toolCalls || toolCalls.length === 0) {
    await chatHistoryAdapter.push(ctx.chatKey, userMessage, content);
    return formatSagaOutput(content, "No tool calls", {
      toolCalls,
      systemPrompt,
    });
  }

  const toolResults = await processToolCalls(toolCalls, ctx);
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
