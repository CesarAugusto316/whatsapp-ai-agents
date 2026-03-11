import {
  cmsAdapter,
  Customer,
  SpecializedDomain,
} from "@/infraestructure/adapters/cms";
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
import {
  customerNameSchema,
  OrderAction,
  orderArgSchema,
} from "@/domain/orders";

/**
 *
 * Genera un prompt para manejar errores de forma amable y contextual al dominio
 */
function errorPrompt(domain: SpecializedDomain): string {
  const vocab = DOMAIN_VOCABULARY[domain];
  return `
    Tu respuesta anterior causó un error. Analizá el error y respondé al usuario en español de forma amable y clara.

    ## Tipos de errores comunes:

    1. **Falta nombre del cliente**: Si el error dice "No customer name provided" o similar
      → Pedí amablemente el nombre del usuario para confirmar su ${vocab.orderWord}
      → Ej: "Para confirmar tu ${vocab.orderWord}, ¿me podrías decir tu nombre?"

    2. **Nombre inválido**: Si el error viene de validación de customerName
      → Explicá que el nombre debe tener 3-30 caracteres, solo letras y espacios
      → Ej: "¿Me podrías decir tu nombre completo? Solo letras, entre 3 y 30 caracteres"

    3. **${vocab.orderWord} vacío**: Si el error dice "empty_cart"
      → Recordá al usuario que su carrito está vacío y ofrecé ayudarle a ${vocab.actionVerbInfinitive}
      → Ej: "Tu carrito está vacío. ¿Querés ver nuestro ${vocab.menuWord} y ${vocab.actionVerb} algo?"

    4. **Error de parsing/argumentos**: Si hay un error técnico de validación
      → Pedí al usuario que reformule su ${vocab.orderWord} de manera más clara
      → Ej: "No entendí bien tu ${vocab.orderWord}. ¿Me lo podés decir de otra forma?"

    5. **Cliente no existe**: Si el error dice "No customer does not exist"
      → Explicá que hubo un problema y pedí el nombre nuevamente
      → Ej: "Tuvimos un problema. ¿Me podrías confirmar tu nombre?"

    ## Reglas:
    - Sé amable y profesional
    - No menciones errores técnicos o de validación
    - Hacé una pregunta clara para que el usuario pueda continuar o complete la información faltante
    - Mantené el contexto del ${vocab.orderWord}.
`.trim();
}

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
    - **Ingresar nombre**: cuando el usuario proporcione su nombre para confirmar el ${vocab.orderWord}

    Parámetros:
    - action: "add" | "remove" | "update" | "view" | "confirm" | "enterUsername"
    - item: { name, quantity (default: 1), notes (opcional) }
    - customerName: string (solo para action: "enterUsername")

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

    ### 👤 INGRESAR NOMBRE (action: "enterUsername")
    **Cuándo usar:** Cuando el usuario proporciona su nombre después de que se lo solicitaron para confirmar el ${vocab.orderWord}.
    **Frases típicas:**
    - "Me llamo Juan" → { action: "enterUsername", customerName: "Juan" }
    - "Soy María" → { action: "enterUsername", customerName: "María" }
    - "Mi nombre es Carlos" → { action: "enterUsername", customerName: "Carlos" }

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

    ## EJEMPLOS ESENCIALES

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

    Usuario: "Me llamo Juan" (después de pedir nombre)
    → manage_cart("enterUsername", { customerName: "Juan" })

    ## DESPUÉS DE CLARIFICACIÓN

    Historial:
    - Usuario: "${productExample1}"
    - Asistente: "¿Querés ver o agregar?"
    - Usuario: "Agregar"
    → manage_cart("add", { name: "${productExample1}", quantity: 1 })

    Historial:
    - Usuario: "2 ${productExample1}s"
    - Asistente: "¿Ver o agregar?"
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
            enum: [
              "add",
              "remove",
              "update",
              "view",
              "confirm",
              "enterUsername",
            ] satisfies OrderAction[],
            description: "The action to perform on the cart",
          },
          customerName: {
            type: "string",
            description: "Customer name (optional)",
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
  action?: string;
};

/**
 * Procesa tool calls del LLM y ejecuta las herramientas
 */
async function processToolCalls(
  toolCalls: ToolCall[],
  ctx: DomainCtx,
): Promise<(ToolResult & { chatMsg: ChatMessage })[]> {
  //
  const businessId = ctx.businessId!;
  const customerPhone = ctx.customerPhone!;
  const orderKey = ctx.productOrderKey;

  return Promise.all(
    toolCalls.map(async (toolCall) => {
      const chat = {
        role: "tool",
        content: "",
        tool_call_id: toolCall.id!,
        name: toolCall.function.name!,
      } satisfies ChatMessage;
      const rawObj =
        typeof JSON.parse(toolCall.function.arguments) === "string"
          ? JSON.parse(JSON.parse(toolCall.function.arguments))
          : JSON.parse(toolCall.function.arguments);

      const { success, data, error } = orderArgSchema.safeParse(rawObj);
      if (!success) {
        return {
          success: false,
          chatMsg: {
            ...chat,
            content: JSON.stringify({ success: false, error }),
          },
        };
      }

      try {
        switch (data.action) {
          //
          case "add": {
            const result = await productOrderStateManager.addProductToCart(
              orderKey,
              businessId,
              data.item!,
            );
            return {
              success: true,
              action: data.action,
              chatMsg: {
                ...chat,
                content: JSON.stringify(result),
              },
            };
          }

          case "remove": {
            const result = await productOrderStateManager.removeProductFromCart(
              orderKey,
              data.item!,
            );
            return {
              success: true,
              action: data.action,
              chatMsg: {
                ...chat,
                content: JSON.stringify(result),
              },
            };
          }

          case "update": {
            const result = await productOrderStateManager.updateProductInCart(
              orderKey,
              businessId,
              data.item!,
            );
            return {
              success: true,
              action: data.action,
              chatMsg: {
                ...chat,
                content: JSON.stringify(result),
              },
            };
          }

          case "view": {
            const result = await productOrderStateManager.viewCart(orderKey);

            if (!result.totalItems) {
              return {
                success: false,
                action: data.action,
                chatMsg: {
                  ...chat,
                  content: JSON.stringify({ message: "empty_cart" }),
                },
              };
            }
            return {
              success: true,
              action: data.action,
              chatMsg: {
                ...chat,
                content: JSON.stringify(result),
              },
            };
          }

          case "enterUsername": {
            const {
              success,
              data: customerName,
              error,
            } = customerNameSchema.safeParse(rawObj?.customerName);
            if (!success) {
              return {
                success: false,
                action: data.action,
                chatMsg: {
                  ...chat,
                  content: JSON.stringify({ error }),
                },
              };
            }
            const result = await productOrderStateManager.enterUsername(
              orderKey,
              customerName,
            );
            return {
              success: true,
              action: data.action,
              chatMsg: {
                ...chat,
                content: JSON.stringify(result),
              },
            };
          }

          case "confirm": {
            const cartPayload =
              await productOrderStateManager.viewCart(orderKey);

            if (!cartPayload.customerName) {
              return {
                success: false,
                action: data.action,
                chatMsg: {
                  ...chat,
                  content: JSON.stringify({
                    error:
                      "No customer name provided, ask the user for their name",
                  }),
                },
              };
            }

            let customerId = cartPayload.customerId || ctx.customer?.id;

            if (!customerId && cartPayload.customerName) {
              // register user
              const newCustomer = (
                (await (
                  await cmsAdapter.createCostumer({
                    business: businessId,
                    phoneNumber: customerPhone || "",
                    name: cartPayload.customerName,
                  })
                ).json()) as { doc: Customer }
              )?.doc;

              customerId = newCustomer?.id;
            }

            if (!customerId) {
              return {
                success: false,
                action: data.action,
                chatMsg: {
                  ...chat,
                  content: JSON.stringify({
                    error: "No customer does not exist",
                  }),
                },
              };
            }

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
              customer: cartPayload.customerId!,
            });

            return {
              success: true,
              action: data.action,
              chatMsg: {
                ...chat,
                content: JSON.stringify({ result, created: true }),
              },
            };
          }

          default:
            return { success: false, chatMsg: chat };
        }
      } catch {
        // Usar args vacíos si falla el parse
      }
      return { success: false, chatMsg: chat };
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
  messages.push(...toolResults.map((r) => r.chatMsg));

  const hasSomeError = toolResults.find((r) => !r.success);

  if (hasSomeError) {
    const finalResponse = await aiAdapter.generateText({
      messages: [
        {
          role: "system",
          content: errorPrompt(domain),
        },
        ...(chatHistory ?? []),
        { role: "user", content: userMessage },
        hasSomeError.chatMsg,
      ],
    });
    return formatSagaOutput(finalResponse, "Error calling tools", {
      messages,
    });
  }

  const finalResponse = await aiAdapter.generateText({
    messages,
  });

  await chatHistoryAdapter.push(ctx.chatKey, userMessage, finalResponse);

  return formatSagaOutput(finalResponse, "tools called", {
    toolCalls,
    systemPrompt,
  });
};
