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
import { DomainCtx, WRITING_STYLE } from "@/domain/booking";
import { productOrderStateManager } from "@/application/services/state-managers";
import { resetRouterHistory } from "./router-agent";
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
    Tu respuesta anterior causó un error. Analiza el error y responde al usuario en español de forma amable y clara.

    ## Tipos de errores comunes:

    1. **Falta nombre del cliente**: Si el error dice "No customer name provided" o similar
      → Pide amablemente el nombre del usuario para confirmar su ${vocab.orderWord}
      → Ej: "Para confirmar tu ${vocab.orderWord}, ¿me podrías decir tu nombre?"

    2. **Nombre inválido**: Si el error viene de validación de customerName
      → Explica que el nombre debe tener 3-30 caracteres, solo letras y espacios
      → Ej: "¿Me podrías decir tu nombre completo? Solo letras, entre 3 y 30 caracteres"

    3. **${vocab.orderWord} vacío**: Si el error dice "empty_cart"
      → Recuerda al usuario que su carrito está vacío y ofrécele ayudarle a ${vocab.actionVerbInfinitive}
      → Ej: "Tu carrito está vacío. ¿Quieres ver nuestro ${vocab.menuWord} y ${vocab.actionVerb} algo?"

    4. **Error de parsing/argumentos**: Si hay un error técnico de validación
      → Pide al usuario que reformule su ${vocab.orderWord} de manera más clara
      → Ej: "No entendí bien tu ${vocab.orderWord}. ¿Me lo puedes decir de otra forma?"

    5. **Cliente no existe**: Si el error dice "No customer does not exist"
      → Explica que hubo un problema y pide el nombre nuevamente
      → Ej: "Tuvimos un problema. ¿Me podrías confirmar tu nombre?"

    ## Reglas:
    - Sé amable y profesional
    - No menciones errores técnicos o de validación
    - Haz una pregunta clara para que el usuario pueda continuar o complete la información faltante
    - Mantén el contexto del ${vocab.orderWord}.
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

  return `
    Eres un asistente especializado en gestionar ${vocab.orderWord}s de clientes para un ${vocab.greetingContext}.

    ## TU ÚNICA FUNCIÓN
    Gestionar el ${vocab.orderWord} del usuario: agregar, quitar, modificar ${vocab.productPlural} y confirmar el ${vocab.orderWord}.

    ## TUS HERRAMIENTAS

    ### manage_cart
    Gestiona el ${vocab.orderWord}. Úsala para:
    - **Agregar**: "agregame", "quiero", "dame", "poneme", "2 platos"
    - **Quitar**: "quitame", "sacame", "eliminame", "borrame"
    - **Modificar**: "cambiame", "mejor dame X", "ahora quiero X"
    - **Ver**: "mostrame mi ${vocab.orderWord}", "¿qué llevo?", "ver ${vocab.orderWord}"
    - **Confirmar**: "confirmo", "listo", "eso es todo", "finalizar"
    - **Ingresar nombre**: cuando el usuario da su nombre para confirmar

    Parámetros:
    - action: "add" | "remove" | "update" | "view" | "confirm" | "enterUsername"
    - item: { name, quantity (default: 1), notes (opcional) }
    - customerName: string (solo para "enterUsername")

    ## DETECCIÓN DE INTENCIÓN

    ### ➕ AGREGAR (action: "add")
    - "Agregame 2 ${productExample1}s" → { action: "add", item: { name: "${productExample1}", quantity: 2 } }
    - "Quiero una ${productExample2}" → { action: "add", item: { name: "${productExample2}", quantity: 1 } }

    ### ➖ QUITAR (action: "remove")
    - "Quitame ${productExample1}" → { action: "remove", item: { name: "${productExample1}", quantity: 1 } }

    ### 🔄 MODIFICAR (action: "update")
    - "Cambiame a 3 ${productExample1}s en lugar de 2" → { action: "update", item: { name: "${productExample1}", quantity: 3 } }

    ### 👁️ VER (action: "view")
    - "Mostrame mi ${vocab.orderWord}" → { action: "view" }

    ### ✅ CONFIRMAR (action: "confirm")
    - "Confirmo" → { action: "confirm" }

    ### 👁️ VER ANTES DE CONFIRMAR (action: "view" → luego "confirm")
    - "Nada más", "eso es todo", "listo", "quiero confirmar" →
      PRIMERO: manage_cart("view") para mostrar resumen
      LUEGO: El sistema preguntará "¿Confirmas tu pedido con X productos?"
      USUARIO: "sí, confirmo" → manage_cart("confirm")

    ### 👤 INGRESAR NOMBRE (action: "enterUsername")
    - "Me llamo Juan" → { action: "enterUsername", customerName: "Juan" }

    ## REGLAS DE ORO

    1. **EXTRAE EL PRODUCTO**: Identifica qué ${vocab.productName} menciona el usuario
    2. **EXTRAE LA CANTIDAD**: Si no se menciona, asume 1
    3. **EXTRAE NOTAS**: Si el usuario dice "sin cebolla", "con extra queso", etc.
    4. **UNA SOLA ACCIÓN POR MENSAJE**: No combines add + remove
    5. **OBLIGATORIO**: Tu ÚNICA forma de responder es llamando a **manage_cart**

    ## CLARIFICACIÓN (CRÍTICO)

    Si el asistente hizo una pregunta de clarificación y el usuario respondió:
    - Usuario: "${productExample1}" → Asistente: "¿Quieres ver o agregar?" → Usuario: "Agregar"
      → **OBLIGATORIO**: manage_cart("add", { name: "${productExample1}", quantity: 1 })
    - Usuario: "2 ${productExample1}s" → Asistente: "¿Ver o agregar?" → Usuario: "Agregar"
      → manage_cart("add", { name: "${productExample1}", quantity: 2 })

    **IMPORTANTE**: Después de clarificación, el usuario YA expresó su intención. Solo ejecuta manage_cart.

    ## CUANDO HAY AMBIGÜEDAD

    Si el usuario menciona un ${vocab.productName} genérico y hay múltiples opciones:
    - Llama manage_cart igual
    - El sistema preguntará "¿Qué ${productExample1} quieres? tenemos ..."

    ## EJEMPLOS

    "Agregame 2 ${productExample1}s" → manage_cart("add", { name: "${productExample1}", quantity: 2 })
    "Quitame una ${productExample2}" → manage_cart("remove", { name: "${productExample2}", quantity: 1 })
    "Mostrame qué llevo" → manage_cart("view")
    "Confirmo mi ${vocab.orderWord}" → manage_cart("confirm")
    "Agregame una ${productExample1} sin cebolla" → manage_cart("add", { name: "${productExample1}", quantity: 1, notes: "sin cebolla" })
    "Me llamo Juan" → manage_cart("enterUsername", { customerName: "Juan" })

    ## IMPORTANTE

    - Tu ÚNICA función es gestionar el ${vocab.orderWord}
    - NO busques ${vocab.productPlural} (eso lo hace el Agente de Búsqueda)
    - Si el usuario pregunta "¿qué ${vocab.productPlural} tienen?", NO llames manage_cart
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
      //
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
                content: JSON.stringify({
                  success: true,
                  action: data.action,
                  ...result,
                }),
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
                content: JSON.stringify({
                  success: true,
                  action: data.action,
                  ...result,
                }),
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
                content: JSON.stringify({
                  success: true,
                  action: data.action,
                  ...result,
                }),
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
                  content: JSON.stringify({
                    success: false,
                    action: data.action,
                    error: "empty_cart",
                  }),
                },
              };
            }
            return {
              success: true,
              action: data.action,
              chatMsg: {
                ...chat,
                content: JSON.stringify({
                  success: true,
                  action: data.action,
                  ...result,
                }),
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
                  content: JSON.stringify({
                    action: data.action,
                    success: false,
                    error,
                  }),
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
                content: JSON.stringify({
                  success: true,
                  action: data.action,
                  ...result,
                }),
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
                    success: false,
                    action: data.action,
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
                    success: false,
                    action: data.action,
                    error: "Customer does not exist",
                  }),
                },
              };
            }

            const result = await cmsAdapter.createProductOrder({
              business: businessId,
              cart: {
                items: cartPayload.products.map((p) => ({
                  productId: p.id!,
                  productName: p.name,
                  quantity: p.quantity,
                  observations: p.notes,
                })),
              },
              customer: customerId,
            });

            // Resetear el historial de routing después de confirmar el pedido
            await resetRouterHistory();

            return {
              success: true,
              action: data.action,
              chatMsg: {
                ...chat,
                content: JSON.stringify({
                  success: true,
                  action: data.action,
                  orderCreated: result,
                }),
              },
            };
          }

          default:
            return {
              success: false,
              chatMsg: {
                ...chat,
                content: JSON.stringify({
                  success: false,
                  error: "Hubo un error, puedes reformular tu solicitud",
                }),
              },
            };
        }
      } catch {
        // Usar args vacíos si falla el parse
      }
      return {
        success: false,
        chatMsg: {
          ...chat,
          content: JSON.stringify({
            success: false,
            error: "Hubo un error, puedes reformular tu solicitud",
          }),
        },
      };
    }),
  );
}

/**
 * Prompt para convertir acciones técnicas en mensaje humano
 */
function humanizePrompt(domain: SpecializedDomain): string {
  const vocab = DOMAIN_VOCABULARY[domain];
  return `
    Eres un asistente amable que convierte acciones técnicas en mensajes naturales para el usuario.

    ${WRITING_STYLE}

    Acciones que puedes recibir:
    - add: se agregaron productos al ${vocab.orderWord}
    - remove: se eliminaron productos del ${vocab.orderWord}
    - update: se modificó el ${vocab.orderWord}
    - view: se mostró el ${vocab.orderWord} (resumen de lo que lleva)
    - confirm: el ${vocab.orderWord} se creó exitosamente luego de confirmación (pedido creado)
    - enterUsername: el usuario proporcionó su nombre

    Casos especiales:
    - Si el usuario dijo "nada más", "eso es todo", "listo" y se ejecutó "view" →
      Muestra el resumen del ${vocab.orderWord} y pregunta "¿Confirmas tu ${vocab.orderWord}?"
    - Si se ejecutó "confirm" → Confirma que el ${vocab.orderWord} fue creado con éxito

    Instrucciones:
    - Sé breve (1-2 oraciones)
    - No menciones JSON, herramientas o detalles técnicos
    - Usa el contexto del ${vocab.orderWord} del usuario
`.trim();
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
    messages,
    tools: PRODUCT_ORDER_TOOLS,
    tool_choice: "required",
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
      useAuxModel: true,
      temperature: 0,
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

    await chatHistoryAdapter.push(ctx.chatKey, userMessage, finalResponse);
    return formatSagaOutput(finalResponse, "Error calling tools", {
      messages,
    });
  }

  // Generar respuesta humana usando el prompt dedicado
  const finalResponse = await aiAdapter.generateText({
    temperature: 0,
    useAuxModel: true,
    messages: [
      { role: "system", content: humanizePrompt(domain) },
      ...chatHistory.filter((m) => m.role !== "system"),
      ...toolResults.map((r) => r.chatMsg),
    ],
  });

  await chatHistoryAdapter.push(ctx.chatKey, userMessage, finalResponse);

  return formatSagaOutput(finalResponse, "cart manager agent", {
    toolCalls,
    toolResults,
    systemPrompt,
  });
};
