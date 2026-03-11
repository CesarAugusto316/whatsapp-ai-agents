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

/**
 *
 * @param domain
 * @returns
 */
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
    - item: { name, quantity (default: 1), notes (opcional) }

    ## DETECCIÓN DE INTENCIÓN - GUÍA RÁPIDA

    ### ➕ AGREGAR (action: "add")
    **Frases típicas:**
    - "Agregame 2 pizzas" → { action: "add", item: { name: "pizza", quantity: 2 } }
    - "Quiero una ensalada césar" → { action: "add", item: { name: "ensalada césar", quantity: 1 } }
    - "Dame la pasta carbonara" → { action: "add", item: { name: "pasta carbonara", quantity: 1 } }
    - "Poneme eso también" → { action: "add", item: { name: "eso", quantity: 1 } }
    - "Me llevo 3 cervezas" → { action: "add", item: { name: "cerveza", quantity: 3 } }

    ### ➖ QUITAR (action: "remove")
    **Frases típicas:**
    - "Quitame la pizza" → { action: "remove", item: { name: "pizza", quantity: 1 } }
    - "Sacame 2 ensaladas" → { action: "remove", item: { name: "ensalada", quantity: 2 } }
    - "Eliminamelo" → { action: "remove", item: { name: "ello", quantity: 1 } }
    - "No quiero eso" → { action: "remove", item: { name: "eso", quantity: 1 } }

    ### 🔄 MODIFICAR (action: "update")
    **Frases típicas:**
    - "Cambiame a 3 pizzas en lugar de 2" → { action: "update", item: { name: "pizza", quantity: 3 } }
    - "Mejor dame 4 cervezas" → { action: "update", item: { name: "cerveza", quantity: 4 } }
    - "Ahora quiero 5" → { action: "update", item: { name: "anterior", quantity: 5 } }

    ### 👁️ VER (action: "view")
    **Frases típicas:**
    - "Mostrame mi ${vocab.orderWord}" → { action: "view" }
    - "¿Qué llevo en el carrito?" → { action: "view" }
    - "Ver carrito" → { action: "view" }

    ### ✅ CONFIRMAR (action: "confirm")
    **Frases típicas:**
    - "Confirmo" → { action: "confirm" }
    - "Listo, eso es todo" → { action: "confirm" }
    - "Finalizar ${vocab.orderWord}" → { action: "confirm" }

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
    - Ejemplo: Usuario ve "Pizza Margherita" → dice "agregame eso" → manage_cart("add", { name: "eso", quantity: 1 })

    ## CUANDO HAY AMBIGÜEDAD

    Si el usuario menciona un ${vocab.productName} genérico ("pizza", "ensalada") y hay múltiples opciones:
    - Llamá manage_cart igual
    - El sistema preguntará "¿Qué pizza querés? Tenemos Margherita, Pepperoni, Vegetariana"

    ## EJEMPLOS COMPLETOS

    Usuario: "Agregame 2 pizzas margherita"
    → manage_cart("add", { name: "pizza margherita", quantity: 2 })

    Usuario: "Quitame una ensalada"
    → manage_cart("remove", { name: "ensalada", quantity: 1 })

    Usuario: "Mostrame qué llevo"
    → manage_cart("view")

    Usuario: "Confirmo mi pedido"
    → manage_cart("confirm")

    Usuario: "Agregame una pasta carbonara sin cebolla"
    → manage_cart("add", { name: "pasta carbonara", quantity: 1, notes: "sin cebolla" })

    Usuario: "Cambiame a 4 pizzas en vez de 2"
    → manage_cart("update", { name: "pizza", quantity: 4 })

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
 * @link https://json-schema.org/understanding-json-schema/about
 * Tools predefinidos para gestión del carrito
 */
const PRODUCT_ORDER_TOOLS: ToolDefinition[] = [
  {
    type: "function" as const,
    function: {
      name: "manage_cart",
      description:
        "Manage the cart by adding, removing, updating items, or viewing/confirming the order.",
      parameters: {
        type: "object" as const,
        properties: {
          action: {
            type: "string",
            enum: ["add", "remove", "update", "view", "confirm"],
            description: "The action to perform on the cart",
          },
          item: {
            type: "object",
            description:
              "Single item to add/remove/update (not needed for view/confirm)",
            properties: {
              name: {
                type: "string",
                description:
                  "Product name or pronoun (e.g., 'pizza', 'ensalada césar', 'eso')",
              },
              quantity: {
                type: "integer",
                minimum: 1,
                default: 1,
                description: "Quantity (default: 1)",
              },
              notes: {
                type: "string",
                description:
                  "Special instructions (e.g., 'sin cebolla', 'con extra queso')",
              },
            },
            required: ["name", "quantity"],
            additionalProperties: false,
          },
        },
        required: ["action"],
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
    case "manage_cart": {
      const keywords = (args.keywords as string) || "";

      return {
        success: true,
        tool: "manage_cart",
        message: "SUCCESS ✅",
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
