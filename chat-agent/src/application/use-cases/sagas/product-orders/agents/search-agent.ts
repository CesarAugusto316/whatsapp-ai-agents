import { WRITING_STYLE } from "@/domain/booking";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import {
  ToolCall,
  ChatMessage,
  ToolDefinition,
} from "@/infraestructure/adapters/ai/open-ai-compatible.types";
import { DomainCtx } from "@/domain/booking";
import { ragService } from "@/application/services/rag";
import { aiAdapter } from "@/infraestructure/adapters/ai";
import { formatSagaOutput } from "@/application/patterns";
import { BookingSagaResult } from "@/application/use-cases/sagas/booking/booking-saga";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { MediaFile } from "@/infraestructure/adapters/whatsapp";
import { productOrderStateManager } from "@/application/services/state-managers";
import { logger } from "@/infraestructure/logging";

/**
 *
 * @param domain
 * @returns
 */
function createSearchAgentPrompt(domain: SpecializedDomain): string {
  const vocab = DOMAIN_VOCABULARY[domain];
  const productExample1 = vocab.productExamples[0];
  const productExample2 = vocab.productExamples[1] || productExample1;
  const productExample3 = vocab.productExamples[2] || productExample1;
  const productExample4 = vocab.productExamples[3] || productExample1;
  const productExample5 = vocab.productExamples[4] || productExample1;

  return `
    Eres un asistente en atención al cliente para un ${vocab.greetingContext}.
    Tu objetivo es ayudar a los usuarios a ${vocab.actionVerbInfinitive} de manera amigable y eficiente.

    ## CONTEXTO
    El usuario está en proceso de ${vocab.actionVerbInfinitive}. Ya confirmó que quiere iniciar un ${vocab.orderWord}.

    ## REGLA CRÍTICA - NUNCA INVENTES
    ⚠️ **PROHIBIDO INVENTAR ${vocab.productPlural} O INFORMACIÓN DEL ${vocab.menuWord}**
    - Toda la información debe venir EXCLUSIVAMENTE de las herramientas
    - Tu función es LLAMAR HERRAMIENTAS, no generar información

    ## TUS HERRAMIENTAS

    ### search_products
    ${vocab.toolDescriptions.searchProducts}
    **Usa cuando:** El usuario menciona un ${vocab.productName} concreto (ej: "${productExample1}", "busco ${productExample2}")

    ### get_menu
    ${vocab.toolDescriptions.getMenu}
    **Usa cuando:** El usuario pide EXPLÍCITAMENTE ver el ${vocab.menuWord}
    **Frases:** "muéstrame el ${vocab.menuWord}", "quiero ver el ${vocab.menuWord}", "pásame el ${vocab.menuWord} en foto"

    ## GUÍA RÁPIDA

    - "Ver ${vocab.menuWord}" (como foto) → get_menu
    - "¿Tienen ${productExample3}?", "busco ${productExample1}", "quiero ${productExample2}" → search_products

    ## REGLAS

    1. **ANALIZA EL ÚLTIMO MENSAJE**: ¿Qué está pidiendo?
    2. **LLAMA LA HERRAMIENTA INMEDIATAMENTE**: No respondas sin usarla
    3. **NUNCA INVENTES**: Sin herramienta = no mencionar ${vocab.productPlural}
    4. **SÉ CONCISO**: Máximo 3-4 oraciones después de obtener resultados

    ${WRITING_STYLE}

    ## FLUJO

    1. Usuario expresa interés en ${vocab.actionVerbInfinitive}
    2. Tú preguntas: "¿Quieres ver el ${vocab.menuWord} completo o que te sugiera ${vocab.productPlural}?"
    3. Usuario responde → **LLAMAS LA HERRAMIENTA**
    4. Presentas resultados y guías hacia la confirmación del ${vocab.orderWord}

    ## EJEMPLOS

    Usuario: "Sí, quiero ver el ${vocab.menuWord}"
    → [LLAMAR get_menu] "¡Aquí tienes el ${vocab.menuWord} completo!"

    Usuario: "¿Tienen ${productExample4}?"
    → [LLAMAR search_products con "${productExample4}"] "¡Sí! Tenemos estas opciones: ..."

    Usuario: "Quiero ${vocab.actionVerb} una ${productExample5}"
    → [LLAMAR search_products con "${productExample5}"] "Tenemos estas ${productExample5}s: ..."

    ## DESPUÉS DE CLARIFICACIÓN

    Usuario: "${productExample1}" → Asistente: "¿Quieres ver o agregar?" → Usuario: "Ver"
    → [LLAMAR search_products con "${productExample1}"]

    Usuario: "2 ${productExample1}s" → Asistente: "¿Ver ${vocab.menuWord} o agregar?" → Usuario: "Ver el ${vocab.menuWord}"
    → [LLAMAR get_menu]

    **IMPORTANTE**: Después de clarificación, el usuario YA expresó que quiere VER. Tu ÚNICA tarea es llamar la herramienta correspondiente.
`.trim();
}

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
              "Specific product keywords to search for (e.g., 'menu de pizzas', 'menu', 'menu infantil')",
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
        name: payload?.name,
        description: payload?.description,
        price: payload?.price,
        estimatedProcessingTime: payload?.estimatedProcessingTime,
        isAvailable: payload?.enabled,
      }));

      logger.info("search_products", { products });

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
async function processToolCalls(
  toolCalls: ToolCall[],
  ctx: DomainCtx,
): Promise<(ToolResult & { chatMsg: ChatMessage })[]> {
  //
  const businessId = ctx.businessId;

  return Promise.all(
    toolCalls.map(async (toolCall) => {
      let args: Record<string, unknown> = {};
      try {
        args =
          typeof JSON.parse(toolCall.function.arguments) === "string"
            ? JSON.parse(JSON.parse(toolCall.function.arguments))
            : JSON.parse(toolCall.function.arguments);
      } catch (error) {
        // Usar args vacíos si falla el parse
        logger.error("Failed to parse tool call arguments", error as Error);
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
export async function searchAgent(
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
): Promise<BookingSagaResult> {
  //
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;

  const systemPrompt = createSearchAgentPrompt(domain);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory ?? []),
    { role: "user", content: userMessage },
  ];

  const { toolCalls, content } = await aiAdapter.generateTextWithTools({
    messages,
    tools: PRODUCT_ORDER_TOOLS,
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

  const toolMessages = toolResults.map((r) => r.chatMsg);
  messages.push(...toolMessages);

  const finalResponse = await aiAdapter.generateText({
    useAuxModel: true,
    temperature: 0,
    messages,
  });

  await chatHistoryAdapter.push(
    ctx.chatKey,
    userMessage,
    finalResponse,
    toolMessages,
  );

  return formatSagaOutput(
    finalResponse,
    "search agent",
    {
      toolCalls,
      toolResults,
      systemPrompt,
    },
    files,
  );
}
