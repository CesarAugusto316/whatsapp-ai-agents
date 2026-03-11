import { cmsAdapter, SpecializedDomain } from "@/infraestructure/adapters/cms";
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
import { productOrderStateManager } from "@/application/services/state-managers";
import { orderArgSchema } from "@/domain/orders";

/**
 *
 * @param domain
 * @returns
 */
function createCartAgentPrompt(domain: SpecializedDomain): string {
  const vocab = DOMAIN_VOCABULARY[domain];
  const productExample1 = vocab.productExamples[0];
  const productExample2 = vocab.productExamples[1] || productExample1;
  const productExample3 = vocab.productExamples[2] || productExample1;

  return `
    Eres un asistente especializado en gestionar ${vocab.orderWord}s de clientes para un ${vocab.greetingContext}.

    ## TU ÚNICA FUNCIÓN
    Gestionar el ${vocab.orderWord} del usuario: agregar, quitar, modificar ${vocab.productPlural} y confirmar el ${vocab.orderWord}.

    ## TUS HERRAMIENTAS

    ### manage_cart
    Gestiona el ${vocab.orderWord} del usuario. Úsala para:
    - **Agregar** ${vocab.productPlural}: cuando el usuario diga "agregame", "quiero", "dame", "poneme", "un item", "2 platos" (cantidad de algo)
    - **Quitar** ${vocab.productPlural}: cuando el usuario diga "quitame", "sacame", "eliminame", "borrame"
    - **Modificar** cantidad: cuando el usuario diga "cambiame", "mejor dame X", "ahora quiero X"
    - **Ver** ${vocab.orderWord}: cuando el usuario diga "mostrame mi ${vocab.orderWord}", "¿qué llevo en el ${vocab.orderWord}?", "ver ${vocab.orderWord}"
    - **Confirmar** ${vocab.orderWord}: cuando el usuario diga "confirmo", "listo", "eso es todo", "finalizar ${vocab.orderWord}"

    Parámetros:
    - action: "add" | "remove" | "update" | "view" | "confirm"
    - item: { name, quantity (default: 1), notes (opcional) }

    ## DETECCIÓN DE INTENCIÓN - GUÍA RÁPIDA

    ### ➕ AGREGAR (action: "add")
    **Frases típicas:**
    - "Agregame 2 ${productExample1}s" → { action: "add", item: { name: "${productExample1}", quantity: 2 } }
    - "Quiero una ${productExample2}" → { action: "add", item: { name: "${productExample2}", quantity: 1 } }
    - "Dame un ${productExample3}" → { action: "add", item: { name: "${productExample3}", quantity: 1 } }
    - "Me llevo 3 ${productExample1}s" → { action: "add", item: { name: "${productExample1}", quantity: 3 } }

    ### ➖ QUITAR (action: "remove")
    **Frases típicas:**
    - "Quitame ${productExample1}" → { action: "remove", item: { name: "${productExample1}", quantity: 1 } }
    - "Sacame 2 ${productExample2}s" → { action: "remove", item: { name: "${productExample2}", quantity: 2 } }

    ### 🔄 MODIFICAR (action: "update")
    **Frases típicas:**
    - "Cambiame a 3 ${productExample1}s en lugar de 2" → { action: "update", item: { name: "${productExample1}", quantity: 3 } }
    - "Mejor dame 4 ${productExample2}s" → { action: "update", item: { name: "${productExample2}", quantity: 4 } }

    ### 👁️ VER (action: "view")
    **Frases típicas:**
    - "Mostrame mi ${vocab.orderWord}" → { action: "view" }
    - "¿Qué llevo en el ${vocab.orderWord}?" → { action: "view" }
    - "Ver ${vocab.orderWord}" → { action: "view" }

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
    5. **OBLIGATORIO**: Tu ÚNICA forma de responder es llamando a **manage_cart**. NUNCA respondas texto sin llamar a la función primero.

    ## CUANDO VIENES DE UNA CLARIFICACIÓN (CRÍTICO)

    Si el historial muestra que el asistente hizo una pregunta de clarificación:
    - Usuario: "${productExample1}" → Asistente: "¿Querés ver o agregar?" → Usuario: "Agregar"
      → **OBLIGATORIO**: manage_cart("add", { name: "${productExample1}", quantity: 1 })
    - Usuario: "${productExample2}" → Asistente: "¿Ver o agregar?" → Usuario: "Ver"
      → **OBLIGATORIO**: manage_cart("view")
    - Usuario: "${productExample3}" → Asistente: "¿Ver o agregar?" → Usuario: "Sí"
      → **OBLIGATORIO**: manage_cart("add", { name: "${productExample3}", quantity: 1 })

    **EXTRAE DEL CONTEXTO**:
    - Si el usuario mencionó un producto antes ("${productExample3}", "${productExample1}") y ahora dice "Agregar", "Sí", "Quiero"
      → manage_cart("add", { name: "${productExample3}"/"${productExample1}", quantity: 1 })
    - Si el usuario dijo "2 ${productExample1}" y responde "Agregar" → manage_cart("add", { name: "${productExample1}", quantity: 2 })

    **IMPORTANTE**: Después de una clarificación, el usuario YA expresó su intención. Tu ÚNICA tarea es ejecutar manage_cart con esa intención.

    ## CUANDO HAY AMBIGÜEDAD

    Si el usuario menciona un ${vocab.productName} genérico ("${productExample1}", "${productExample2}") y hay múltiples opciones:
    - Llamá manage_cart igual
    - El sistema preguntará "¿Qué ${productExample1} querés? tenemos ..."

    ## EJEMPLOS COMPLETOS

    Usuario: "Agregame 2 ${productExample1}s"
    → manage_cart("add", { name: "${productExample1}", quantity: 2 })

    Usuario: "Quitame una ${productExample2}"
    → manage_cart("remove", { name: "${productExample2}", quantity: 1 })

    Usuario: "Mostrame qué llevo"
    → manage_cart("view")

    Usuario: "Confirmo mi ${vocab.orderWord}"
    → manage_cart("confirm")

    Usuario: "Agregame una ${productExample3} sin cebolla"
    → manage_cart("add", { name: "${productExample3}", quantity: 1, notes: "sin cebolla" })

    Usuario: "Cambiame a 4 ${productExample1}s en vez de 2"
    → manage_cart("update", { name: "${productExample1}", quantity: 4 })

    ## EJEMPLOS DESPUÉS DE CLARIFICACIÓN

    Historial:
    - Usuario: "${productExample1}"
    - Asistente: "¿Querés ver qué ${vocab.productPlural} tenemos o querés agregar ${productExample1} a tu ${vocab.orderWord}?"
    - Usuario: "Agregar"
    → manage_cart("add", { name: "${productExample1}", quantity: 1 })

    Historial:
    - Usuario: "${productExample2}"
    - Asistente: "¿Querés ver el ${vocab.menuWord} o agregar?"
    - Usuario: "Ver"
    → manage_cart("view")

    Historial:
    - Usuario: "${productExample3}"
    - Asistente: "¿Querés ver o agregar?"
    - Usuario: "Sí"
    → manage_cart("add", { name: "${productExample3}", quantity: 1 })

    Historial:
    - Usuario: "2 ${productExample1}s"
    - Asistente: "¿Querés ver o agregar?"
    - Usuario: "Agregar"
    → manage_cart("add", { name: "${productExample1}", quantity: 2 })

    ## IMPORTANTE

    - Tu ÚNICA función es gestionar el ${vocab.orderWord}
    - Siempre llama a manage_cart para gestionar el ${vocab.orderWord}
    - NO busques ${vocab.productPlural} (eso lo hace el Agente de Búsqueda)
    - NO respondas preguntas sobre el menú (eso lo hace el Agente de Búsqueda)
    - Si el usuario pregunta "¿qué ${vocab.productPlural} tienen?", NO llames manage_cart, el Router te derivó mal
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

/**
 * Procesa tool calls del LLM y ejecuta las herramientas
 */
async function processToolCalls(
  toolCalls: ToolCall[],
  ctx: DomainCtx,
): Promise<ChatMessage[]> {
  //
  const businessId = ctx.businessId!;
  const orderKey = ctx.productOrderKey;

  return Promise.all(
    toolCalls.map(async (toolCall) => {
      const chat = {
        role: "tool",
        content: "",
        tool_call_id: toolCall.id!,
        name: toolCall.function.name!,
      } satisfies ChatMessage;
      const { success, data, error } = orderArgSchema.safeParse(
        JSON.parse(toolCall.function.arguments),
      );
      if (!success) {
        return {
          ...chat,
          content: JSON.stringify({ success: false, error }),
        } satisfies ChatMessage;
      }
      try {
        switch (data.action) {
          case "add": {
            const result = await productOrderStateManager.addProductToCart(
              orderKey,
              businessId,
              data.item,
            );
            return {
              ...chat,
              content: JSON.stringify(result),
            } satisfies ChatMessage;
          }
          case "remove": {
            const result = await productOrderStateManager.removeProductFromCart(
              orderKey,
              data.item,
            );
            return {
              ...chat,
              content: JSON.stringify(result),
            } satisfies ChatMessage;
          }
          case "update": {
            const result = await productOrderStateManager.updateProductInCart(
              orderKey,
              businessId,
              data.item,
            );
            return {
              ...chat,
              content: JSON.stringify(result),
            } satisfies ChatMessage;
          }
          case "confirm": {
            const cartPayload =
              await productOrderStateManager.viewCart(orderKey);
            const result = await cmsAdapter.createProductOrder({
              business: businessId,
              cart: {
                items: cartPayload.products.map((p) => ({
                  productId: p.id,
                  productName: p.name,
                  quantity: p.quantity,
                  observations: p.notes,
                })),
              },
              customer: "",
            });
            return {
              ...chat,
              content: JSON.stringify({ result, created: true }),
            } satisfies ChatMessage;
          }
          default:
            return { ...chat, content: "" } satisfies ChatMessage;
        }
      } catch {
        // Usar args vacíos si falla el parse
      }

      return { ...chat };
    }),
  );
}

export const cartManagerAgent = async (
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
) => {
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

  const toolResults = await processToolCalls(toolCalls, ctx);
  messages.push(...toolResults);

  const finalResponse = await aiAdapter.generateText({
    messages,
  });

  await chatHistoryAdapter.push(ctx.chatKey, userMessage, finalResponse);

  return formatSagaOutput(finalResponse, "tools called", {
    toolCalls,
    systemPrompt,
  });
};
