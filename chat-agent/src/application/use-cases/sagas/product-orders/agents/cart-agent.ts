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
import { DomainCtx, WRITING_STYLE } from "@/domain/booking";
import { productOrderStateManager } from "@/application/services/state-managers";
import {
  customerNameSchema,
  OrderAction,
  orderArgSchema,
} from "@/domain/orders";
import { RouterOutput } from "./router-agent";

const TOOL_NAME = "manage_cart";

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
      name: TOOL_NAME,
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

    3. **Error de parsing/argumentos**: Si hay un error técnico de validación
      → Pide al usuario que reformule su ${vocab.orderWord} de manera más clara
      → Ej: "No entendí bien tu ${vocab.orderWord}. ¿Me lo puedes decir de otra forma?"

    4. **Cliente no existe**: Si el error dice "No customer does not exist"
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
 * Prompt para convertir acciones técnicas en mensaje humano
 */
function humanizePrompt(domain: SpecializedDomain, lastAction: string): string {
  const vocab = DOMAIN_VOCABULARY[domain];
  return `
    Eres un asistente amable que convierte acciones técnicas en mensajes naturales para el usuario.

    ${WRITING_STYLE}

    Acciones que puedes recibir:
    - add: se agregaron productos al ${vocab.orderWord}
    - remove: se eliminaron productos del ${vocab.orderWord}
    - update: se modificó el ${vocab.orderWord}
    - enterUsername: el usuario proporcionó su nombre

    Preguntas de cierre según la acción:

    1. **add/remove/update** → Preguntar si desea algo más o si quiere confirmar
       - "¿Te gustaría agregar algo más o eso es todo?"
       - "¿Quieres agregar otro ${vocab.productName} o procedemos a confirmar tu ${vocab.orderWord}?"
       - "¿Algo más para tu ${vocab.orderWord} o confirmamos?"
       - Varía las frases para que no suenen repetitivas

    2. **enterUsername** → Confirmar recepción del nombre
       - "¡Gracias! Nombre registrado"
       - "¡Perfecto! Ya tengo tu nombre"

    CONTEXT:
    - lastAction: ${lastAction}

    Instrucciones:
    - Sé breve (1-2 oraciones)
    - No menciones JSON, herramientas o detalles técnicos
    - Usa el contexto del ${vocab.orderWord} del usuario
    - Varía las preguntas de cierre para que no suenen robóticas
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
    Gestionar el ${vocab.orderWord} del usuario: agregar, quitar, modificar ${vocab.productPlural}.

    ## TUS HERRAMIENTAS

    ### ${TOOL_NAME}
    Gestiona el ${vocab.orderWord}. Úsala para:
    - **Agregar**: "agregame", "quiero", "dame", "poneme", "2 platos"
    - **Quitar**: "quitame", "sacame", "eliminame", "borrame"
    - **Modificar**: "cambiame", "mejor dame X", "ahora quiero X"
    - **Ingresar nombre**: cuando el usuario da su nombre para confirmar

    Parámetros:
    - action: "add" | "remove" | "update" | "enterUsername"
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

    ### 👤 INGRESAR NOMBRE (action: "enterUsername")
    - "Me llamo Juan" → { action: "enterUsername", customerName: "Juan" }

    ## REGLAS DE ORO

    1. **EXTRAE EL PRODUCTO**: Identifica qué ${vocab.productName} menciona el usuario
    2. **EXTRAE LA CANTIDAD**: Si no se menciona, asume 1
    3. **EXTRAE NOTAS**: Si el usuario dice "sin cebolla", "con extra queso", etc.
    4. **UNA SOLA ACCIÓN POR MENSAJE**: No combines add + remove
    5. **OBLIGATORIO**: Tu ÚNICA forma de responder es llamando a **${TOOL_NAME}**

    ## CLARIFICACIÓN (CRÍTICO)

    Si el asistente hizo una pregunta de clarificación y el usuario respondió:
    - Usuario: "${productExample1}" → Asistente: "¿Quieres ver o agregar?" → Usuario: "Agregar"
      → **OBLIGATORIO**: ${TOOL_NAME}("add", { name: "${productExample1}", quantity: 1 })
    - Usuario: "2 ${productExample1}s" → Asistente: "¿Ver o agregar?" → Usuario: "Agregar"
      → ${TOOL_NAME}("add", { name: "${productExample1}", quantity: 2 })

      **IMPORTANTE**: Después de clarificación, el usuario YA expresó su intención. Solo ejecuta ${TOOL_NAME}.

    ## CUANDO HAY AMBIGÜEDAD

    Si el usuario menciona un ${vocab.productName} genérico y hay múltiples opciones:
    - Llama ${TOOL_NAME} igual
    - El sistema preguntará "¿Qué ${productExample1} quieres? tenemos ..."

    ## EJEMPLOS

    "Agregame 2 ${productExample1}s" → ${TOOL_NAME}("add", { name: "${productExample1}", quantity: 2 })
    "Quitame una ${productExample2}" → ${TOOL_NAME}("remove", { name: "${productExample2}", quantity: 1 })
    "Confirmo mi ${vocab.orderWord}" → El sistema se encargará de confirmar
    "Agregame una ${productExample1} sin cebolla" → ${TOOL_NAME}("add", { name: "${productExample1}", quantity: 1, notes: "sin cebolla" })
    "Me llamo Juan" → ${TOOL_NAME}("enterUsername", { customerName: "Juan" })

    ## IMPORTANTE

    - Tu ÚNICA función es gestionar el ${vocab.orderWord}
    - NO busques ${vocab.productPlural} (eso lo hace el Agente de Búsqueda)
    - Si el usuario pregunta "¿qué ${vocab.productPlural} tienen?", NO llames manage_cart
    - Las acciones de "ver carrito" y "confirmar pedido" las maneja otro agente
    - No confirmes ${vocab.orderWord}.
`.trim();
}

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

export const cartManagerAgent = async (
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
  routerAgent: RouterOutput,
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
  const toolMessages = toolResults.map((r) => r.chatMsg);
  messages.push(...toolMessages);

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
  const lastAction = toolResults.at(-1)?.action!;
  const finalResponse = await aiAdapter.generateText({
    temperature: 0,
    useAuxModel: true,
    messages: [
      {
        role: "system",
        content: humanizePrompt(domain, lastAction),
      },
      ...chatHistory.filter((m) => m.role !== "system"),
      ...toolMessages,
    ],
  });

  await chatHistoryAdapter.push(
    ctx.chatKey,
    userMessage,
    finalResponse,
    toolMessages,
  );

  await Promise.all(
    toolResults.map((tool) => {
      return productOrderStateManager.saveRouterHistory(ctx.productOrderKey, {
        agent: routerAgent,
        toolName: tool.chatMsg.name,
        action: tool.action,
        userMessage,
      });
    }),
  );

  return formatSagaOutput(finalResponse, "cart manager agent", {
    toolCalls,
    toolResults,
    systemPrompt,
  });
};
