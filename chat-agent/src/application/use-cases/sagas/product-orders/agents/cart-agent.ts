import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import {
  aiAdapter,
  ChatMessage,
  ToolCall,
  ToolDefinition,
} from "@/infraestructure/adapters/ai";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { formatSagaOutput } from "@/application/patterns";
import { DomainCtx } from "@/domain/booking";

function createCartAgentPrompt(domain: SpecializedDomain): string {
  const vocab = DOMAIN_VOCABULARY[domain];

  return `
    Eres un asistente especializado en gestionar ${vocab.orderWord}s de clientes para un ${vocab.greetingContext}.

    ## TU ÚNICA FUNCIÓN
    Gestionar el carrito/${vocab.orderWord} del usuario: agregar, quitar, modificar ${vocab.productPlural} y confirmar el ${vocab.orderWord}.

    ## TUS HERRAMIENTAS

    ### manage_cart
    Gestiona el carrito del usuario. Úsala para:
    - **Agregar** ${vocab.productPlural}: cuando el usuario diga "agregame", "quiero", "dame", "poneme"
    - **Quitar** ${vocab.productPlural}: cuando el usuario diga "quitame", "sacame", "eliminame", "borrame"
    - **Modificar** cantidad: cuando el usuario diga "cambiame", "mejor dame X", "ahora quiero X"
    - **Ver** carrito: cuando el usuario diga "mostrame mi ${vocab.orderWord}", "¿qué llevo?", "ver carrito"
    - **Confirmar** ${vocab.orderWord}: cuando el usuario diga "confirmo", "listo", "eso es todo", "finalizar"

    Parámetros:
    - action: "add" | "remove" | "update" | "view" | "confirm"
    - items: lista de productos con { name, quantity, notes (opcional) }

    ## DETECCIÓN DE INTENCIÓN - GUÍA RÁPIDA

    ### ➕ AGREGAR (action: "add")
    **Frases típicas:**
    - "Agregame 2 pizzas" → { action: "add", items: [{ name: "pizza", quantity: 2 }] }
    - "Quiero una ensalada césar" → { action: "add", items: [{ name: "ensalada césar", quantity: 1 }] }
    - "Dame la pasta carbonara" → { action: "add", items: [{ name: "pasta carbonara", quantity: 1 }] }
    - "Poneme eso también" → { action: "add", items: [{ name: "eso", quantity: 1 }] } (el sistema resolverá "eso")
    - "Me llevo 3 cervezas" → { action: "add", items: [{ name: "cerveza", quantity: 3 }] }

    ### ➖ QUITAR (action: "remove")
    **Frases típicas:**
    - "Quitame la pizza" → { action: "remove", items: [{ name: "pizza", quantity: 1 }] }
    - "Sacame 2 ensaladas" → { action: "remove", items: [{ name: "ensalada", quantity: 2 }] }
    - "Eliminamelo" → { action: "remove", items: [{ name: "ello", quantity: 1 }] }
    - "No quiero eso" → { action: "remove", items: [{ name: "eso", quantity: 1 }] }

    ### 🔄 MODIFICAR (action: "update")
    **Frases típicas:**
    - "Cambiame a 3 pizzas en lugar de 2" → { action: "update", items: [{ name: "pizza", quantity: 3 }] }
    - "Mejor dame 4 cervezas" → { action: "update", items: [{ name: "cerveza", quantity: 4 }] }
    - "Ahora quiero 5" (refiriéndose a algo previo) → { action: "update", items: [{ name: "anterior", quantity: 5 }] }

    ### 👁️ VER (action: "view")
    **Frases típicas:**
    - "Mostrame mi ${vocab.orderWord}" → { action: "view", items: [] }
    - "¿Qué llevo en el carrito?" → { action: "view", items: [] }
    - "Ver carrito" → { action: "view", items: [] }
    - "¿Cuánto llevo?" → { action: "view", items: [] }

    ### ✅ CONFIRMAR (action: "confirm")
    **Frases típicas:**
    - "Confirmo" → { action: "confirm", items: [] }
    - "Listo, eso es todo" → { action: "confirm", items: [] }
    - "Finalizar ${vocab.orderWord}" → { action: "confirm", items: [] }
    - "Sí, confirmo mi ${vocab.orderWord}" → { action: "confirm", items: [] }

    ## REGLAS DE ORO

    1. **EXTRAE EL PRODUCTO**: Identificá qué ${vocab.productName} menciona el usuario
    2. **EXTRAE LA CANTIDAD**: Si no se menciona, asumí 1
    3. **EXTRAE NOTAS**: Si el usuario dice "sin cebolla", "con extra queso", etc.
    4. **UNA SOLA ACCIÓN POR MENSAJE**: No combines add + remove en la misma respuesta
    5. **SIEMPRE LLAMÁ manage_cart**: Antes de responder sobre el carrito

    ## CUANDO EL USUARIO DICE "ESO", "ESTO", "AQUELLO"

    Si el usuario usa pronombres ("eso", "esto", "aquello", "ello"):
    - Usá manage_cart con el nombre literal "eso"
    - El sistema buscará en el contexto previo qué producto se mencionó antes
    - Ejemplo: Usuario ve "Pizza Margherita" → dice "agregame eso" → manage_cart("add", [{ name: "eso", quantity: 1 }])

    ## CUANDO HAY AMBIGÜEDAD

    Si el usuario menciona un ${vocab.productName} genérico ("pizza", "ensalada") y hay múltiples opciones:
    - Llamá manage_cart igual
    - El sistema preguntará "¿Qué pizza querés? Tenemos Margherita, Pepperoni, Vegetariana"

    ## EJEMPLOS COMPLETOS

    Usuario: "Agregame 2 pizzas margherita"
    → manage_cart("add", [{ name: "pizza margherita", quantity: 2 }])

    Usuario: "Quitame una ensalada"
    → manage_cart("remove", [{ name: "ensalada", quantity: 1 }])

    Usuario: "Mostrame qué llevo"
    → manage_cart("view", [])

    Usuario: "Confirmo mi pedido"
    → manage_cart("confirm", [])

    Usuario: "Agregame una pasta carbonara sin cebolla"
    → manage_cart("add", [{ name: "pasta carbonara", quantity: 1, notes: "sin cebolla" }])

    Usuario: "Cambiame a 4 pizzas en vez de 2"
    → manage_cart("update", [{ name: "pizza", quantity: 4 }])

    ## ESTILO DE ESCRITURA

    - Claro, conciso y amigable
    - Usá emojis cuando sea apropiado 🛒✅❌
    - Confirmá cada acción: "✅ 2 pizzas agregadas"
    - Después de agregar, preguntá: "¿Algo más o confirmamos?"
    - NUNCA menciones que sos un asistente, sistema o IA

    ## IMPORTANTE

    - Tu ÚNICA función es gestionar el carrito
    - NO busques ${vocab.productPlural} (eso lo hace el Agente de Búsqueda)
    - NO respondas preguntas sobre el menú (eso lo hace el Agente de Búsqueda)
    - Si el usuario pregunta "¿qué pizzas tienen?", NO llames manage_cart, el Router te derivó mal
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
      const keywords = (args.keywords as string) || "";
      const limit = 5;
      // Usar keywords si está disponible, sino usar intent
      // const results = await ragService.searchProducts(
      //   keywords,
      //   businessId,
      //   limit,
      // );

      // const products = results.points?.map(({ payload }) => ({
      //   ...payload,
      //   isAvailable: payload?.enabled,
      // }));

      // if (!products?.length) {
      //   return {
      //     success: false,
      //     tool: "search_products",
      //     message:
      //       "No se encontraron productos, se debe pedir alternativas al usuario",
      //     // files: [],
      //   };
      // }

      return {
        success: true,
        tool: "search_products",
        message: JSON.stringify({
          // products,
        }),
        // files: [],
      };
    }

    case "get_menu": {
      const keywords = (args.keywords as string) || "menu";
      const limit = 3;
      // const { points } = await ragService.searchBusinessMedia(
      //   keywords,
      //   businessId,
      //   limit,
      // );
      // const files =
      //   points?.map((p) => ({
      //     filename: p.payload.filename ?? "",
      //     url: p.payload.url ?? "",
      //     mimetype: p.payload.mimeType ?? "",
      //     alt: p.payload.alt ?? "",
      //   })) ?? [];

      // if (!files.length) {
      //   return {
      //     success: false,
      //     tool: "get_menu",
      //     message:
      //       "No se encontró el menú, se debe pedir alternativas al usuario",
      //     files: [],
      //   };
      // }

      return {
        success: true,
        tool: "get_menu",
        message: "Menú encontrado, SUCCESS ✅",
        // files,
      };
    }

    default:
      return {
        success: false,
        tool: "unknown_tool",
        message: JSON.stringify({ error: `Unknown tool: ${name}` }),
        // files: [],
      };
  }
}

/**
 * Procesa tool calls del LLM y ejecuta las herramientas
 */
async function processToolCalls(
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

export const cartAgent = async (ctx: DomainCtx, chatHistory: ChatMessage[]) => {
  //
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;

  const systemPrompt = createCartAgentPrompt(domain);

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

  const toolResults = await processToolCalls(toolCalls, ctx.businessId);

  messages.push(...toolResults.map((r) => r.chatMsg));

  const finalResponse = await aiAdapter.generateText({
    messages,
  });

  await chatHistoryAdapter.push(ctx.chatKey, userMessage, finalResponse);

  return formatSagaOutput(finalResponse, "tools called", {
    toolCalls,
    systemPrompt,
  });
};
