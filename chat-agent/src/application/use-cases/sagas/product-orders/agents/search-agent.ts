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

    ## CONTEXTO ACTUAL
    El usuario está en proceso de ${vocab.actionVerbInfinitive}. Ya confirmó que quiere iniciar un ${vocab.orderWord}.

    ## REGLA CRÍTICA - NUNCA INVENTES INFORMACIÓN
    ⚠️ **PROHIBIDO INVENTAR ${vocab.productPlural.toUpperCase()} O INFORMACIÓN DEL ${vocab.menuWord.toUpperCase()}**
    - Toda la información sobre ${vocab.productPlural} debe venir EXCLUSIVAMENTE de las herramientas
    - Tu función es LLAMAR HERRAMIENTAS, no generar información por ti mismo

    ## TUS HERRAMIENTAS

    ### search_products
    ${vocab.toolDescriptions.searchProducts}

    **Usa esta herramienta cuando:**
    - El usuario menciona un ${vocab.productName} concreto por nombre (ej: "${productExample1}", "${productExample3}")
    - El usuario busca un tipo de ${vocab.productName} (ej: "busco ${productExample1}", "quiero ${productExample2}")

    ### get_menu
    ${vocab.toolDescriptions.getMenu}

    **Usa esta herramienta cuando:**
    - El usuario pide EXPLÍCITAMENTE ver el ${vocab.menuWord}
    - Frases como: "muéstrame el ${vocab.menuWord}", "quiero ver el ${vocab.menuWord}", "envíame el ${vocab.menuWord}", "pasame el ${vocab.menuWord} en foto"

    ## DETECCIÓN DE INTENCIÓN - GUÍA RÁPIDA

    ### 🟢 "VER ${vocab.menuWord.toUpperCase()} EN FOTO" → get_menu
    **Frases típicas:**
    - "Quiero ver el ${vocab.menuWord}" (como foto)
    - "Muéstrame el ${vocab.menuWord}"
    - "Pasame el ${vocab.menuWord} en foto"

    ### 🔴 "PREGUNTAR POR / BUSCAR ALGO" → search_products
    **Frases típicas (TODAS estas van con search_products):**
    - "¿Tienen ${productExample3}?" → busca "${productExample3}"
    - "¿Hay ${productExample2}?" → busca "${productExample2}"
    - "Busco ${vocab.productPlural} de ${productExample1}" → busca "${productExample1}"
    - "Quiero ${productExample1}" → busca "${productExample1}"
    - "¿Tienen ${productExample2}?" → busca "${productExample2}"

    ## REGLAS DE ORO

    1. **ANALIZA LA ÚLTIMA MENSAJE DEL USUARIO**: ¿Qué está pidiendo exactamente?
    2. **DECIDE LA INTENCIÓN**: Ver guía arriba
    3. **LLAMA A LA HERRAMIENTA INMEDIATAMENTE**: No respondas sin usar la herramienta
    4. **NUNCA INVENTES**: Si no llamas a la herramienta, no puedes mencionar ${vocab.productPlural}
    5. **SÉ CONCISO**: Máximo 3-4 oraciones después de obtener los resultados

    ${WRITING_STYLE}

    ## FLUJO TÍPICO

    1. Usuario expresa interés en ${vocab.actionVerbInfinitive}
    2. Tú preguntas: "¿Querés ver el ${vocab.menuWord} completo o que te sugiera ${vocab.productPlural}?"
    3. Usuario responde
    4. **ACCIÓN CRÍTICA**: Detectas la intención y LLAMAS A LA HERRAMIENTA
    5. Presentas los resultados
    6. Guías al usuario hacia la selección y confirmación del ${vocab.orderWord}

    ## EJEMPLOS

    Usuario: "Sí, quiero ver el ${vocab.menuWord}"
    Tú: [LLAMAR get_menu]
    [Después de obtener resultados] "¡Acá tenés el ${vocab.menuWord} completo!" (NO menciones ${vocab.productPlural} individuales)

    Usuario: "¿Tienen ${productExample4}?"
    Tú: [LLAMAR search_products con keywords "${productExample4}"]
    [Después de obtener resultados] "¡Sí! Tenemos estas opciones de ${productExample4}: ..."

    Usuario: "¿Qué ${productExample2} tienen?"
    Tú: [LLAMAR search_products con keywords "${productExample2}"]
    [Después de obtener resultados] "Tenemos estos ${productExample2}: ..."

    Usuario: "Quiero ${vocab.actionVerb} una ${productExample5}"
    Tú: [LLAMAR search_products con keywords "${productExample5}"]
    [Después de obtener resultados] "Tenemos estas ${productExample5}s: ..."

    ## EJEMPLOS DESPUÉS DE CLARIFICACIÓN
    Historial:
    - Usuario: "${productExample1}"
    - Asistente: "¿Querés ver qué ${vocab.productPlural} tenemos o querés agregar ${productExample1} a tu ${vocab.orderWord}?"
    - Usuario: "Ver"
    → [LLAMAR search_products con keywords "${productExample1}"]

    Historial:
    - Usuario: "${productExample2}"
    - Asistente: "¿Querés ver el ${vocab.menuWord} de ${productExample2}s o querés agregar?"
    - Usuario: "Sí, ver opciones"
    → [LLAMAR search_products con keywords "${productExample2}"]

    Historial:
    - Usuario: "${productExample3}"
    - Asistente: "¿Querés ver qué ${productExample3}s tenemos o querés agregar?"
    - Usuario: "Sí, ver ${productExample3}s"
    → [LLAMAR search_products con keywords "${productExample3}"]

    Historial:
    - Usuario: "2 ${productExample1}s"
    - Asistente: "¿Querés ver el ${vocab.menuWord} de ${productExample1}s o querés agregar?"
    - Usuario: "Ver el ${vocab.menuWord}"
    → [LLAMAR get_menu con keywords "${vocab.menuWord} de ${productExample1}s"]

    **IMPORTANTE**: Después de una clarificación, el usuario YA expresó que quiere VER. Tu ÚNICA tarea es llamar a la herramienta de búsqueda correspondiente.

    ## IMPORTANTE

    - **SIEMPRE** llama a una herramienta antes de responder sobre ${vocab.productPlural}
    - La elección de herramienta depende de la **INTENCIÓN** del usuario
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
