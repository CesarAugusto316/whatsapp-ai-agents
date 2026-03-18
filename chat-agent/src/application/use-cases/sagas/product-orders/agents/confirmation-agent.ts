import { productOrderStateManager } from "@/application/services/state-managers";
import { DomainCtx, WRITING_STYLE } from "@/domain/booking";
import {
  cmsAdapter,
  Customer,
  ProductOrder,
  SpecializedDomain,
} from "@/infraestructure/adapters/cms";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { formatSagaOutput } from "@/application/patterns";
import { shouldSkipEmbedding } from "@/application/services/pomdp";
import { ragService } from "@/application/services/rag";

const processOrder = async (ctx: DomainCtx) => {
  const businessId = ctx.businessId;
  const customerPhone = ctx.customerPhone;
  const orderKey = ctx.productOrderKey;

  const cartPayload = await productOrderStateManager.viewCart(orderKey);

  if (!cartPayload.customerName) {
    return {
      success: false,
      error: "No customer name provided, ask the user for their name",
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
      error:
        "Customer does not exist. No customer name provided, ask the user for their name",
    };
  }

  if (!cartPayload.summary.length) {
    return {
      success: false,
      error: "No products in the cart",
    };
  }

  const result = await cmsAdapter.createProductOrder({
    business: businessId,
    cart: {
      items: cartPayload.summary,
      estimatedProcessingTime: cartPayload.estimatedProcessingTime ?? {
        max: 60,
        min: 30,
        unit: "minutes",
      },
      total: cartPayload.summary.reduce((acc, item) => acc + item.subTotal, 0),
    },
    customer: customerId,
  });

  // Resetear el historial de routing después de confirmar el pedido
  await productOrderStateManager.resetRouterHistory(orderKey);

  return { success: true, data: result };
};

const orderProcessPrompt = (
  domain: SpecializedDomain,
  order: { success: boolean; data?: ProductOrder; error?: string },
) => {
  const vocab = DOMAIN_VOCABULARY[domain];

  if (order.success) {
    return `
      Tu ${vocab.orderWord} ha sido confirmado con éxito ✅

      ## Detalles del ${vocab.orderWord}:
      - ID de la orden: ${order.data?.id} (Sirve para retirar)
      - Productos:
         ${order.data?.cart.items.map((item) => `- ${item.quantity} ${item.productName} x ${item.price} = ${item.subTotal}`).join(", ")}
      - Total: $ ${order.data?.cart.total}
      - Tiempo estimado: ${order.data?.cart.estimatedProcessingTime ? "" : "No disponible"}

      ## Instrucciones:
      - Informa al usuario que su ${vocab.orderWord} fue procesado correctamente
      - Menciona los detalles principales del ${vocab.orderWord} de forma clara y amable
      - Indica el tiempo estimado de preparación/entrega si aplica al negocio
      - Ofrece ayuda adicional si necesita algo más

      ${WRITING_STYLE}
    `.trim();
  }

  // Error case
  return `
    No pudimos procesar tu ${vocab.orderWord} ❌

    ## Razón del error:
    ${order.error || "Error desconocido"}

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

    6. **No products in the cart**: Si el error dice "No products in the cart"
      → Explica que el carrito está vacío y pide al usuario que agregue productos
      → Ej: "Tu carrito está vacío. ¿Quieres ver nuestro ${vocab.menuWord} y ${vocab.actionVerb} algo?"

    ## Instrucciones:
    - Informa al usuario de forma amable que hubo un problema con su ${vocab.orderWord}
    - Explica la razón del error en términos sencillos (sin tecnicismos)
    - Ofrece una solución o alternativa para resolver el problema
    - Pide la información faltante si es necesario

    ${WRITING_STYLE}
  `.trim();
};

/**
 *
 * @param ctx
 * @returns
 */
export const processOrderAgent = async (
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
) => {
  //
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;

  let isConfirmed = false;
  const { skip, kind, msg } = shouldSkipEmbedding(ctx.customerMessage);

  if (skip && kind === "conversational-signal") {
    isConfirmed = msg === "signal:affirmation";
  } else {
    const limit = 1;
    const { points } = await ragService.searchIntent(
      ctx.customerMessage,
      ["conversational-signal"], // ej: ["informational", "booking", "products"],
      domain,
      limit,
    );
    const intent = points[0].payload;

    if (intent.module === "conversational-signal") {
      const key = intent.intentKey as "signal:negation" | "signal:affirmation";
      isConfirmed = key === "signal:affirmation";
    }
  }

  if (!isConfirmed) {
    // Usuario no confirmó - preguntar si desea algo más
    const vocab = DOMAIN_VOCABULARY[domain];
    const simplePrompt = `
      El usuario no confirmó su ${vocab.orderWord}.

      ${WRITING_STYLE}

      ## Instrucciones:
      - Responde de forma simple y amable
      - Pregunta si desea algo más o si tiene alguna otra consulta
      - No menciones el ${vocab.orderWord} ni presiones al usuario

      Ejemplos:
      - "¡No hay problema! ¿En qué más puedo ayudarte?"
      - "¡Claro! ¿Hay algo más en lo que pueda ayudarte?"
      - "¡Perfecto! ¿Tienes alguna otra consulta?"
    `.trim();

    const messages: ChatMessage[] = [
      { role: "system", content: simplePrompt },
      ...chatHistory,
      { role: "user", content: userMessage },
    ];

    const finalResponse = await aiAdapter.generateText({
      temperature: 0,
      useAuxModel: true,
      messages,
    });

    await chatHistoryAdapter.push(ctx.chatKey, userMessage, finalResponse);
    await productOrderStateManager.setHasAskedForConfirmation(
      ctx.productOrderKey,
      false,
    );
    return formatSagaOutput(finalResponse, "order not confirmed ❌", {
      systemPrompt: simplePrompt,
    });
  }
  // isConfirmed=true

  const order = await processOrder(ctx);
  const systemPrompt = orderProcessPrompt(domain, order);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const finalResponse = await aiAdapter.generateText({
    temperature: 0,
    useAuxModel: true,
    messages,
  });

  await chatHistoryAdapter.push(ctx.chatKey, userMessage, finalResponse);
  await productOrderStateManager.setHasAskedForConfirmation(
    ctx.productOrderKey,
    false,
  );
  return formatSagaOutput(finalResponse, "order completed ✅", {
    systemPrompt,
  });
};
