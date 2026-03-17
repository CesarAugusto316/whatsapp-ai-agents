import { productOrderStateManager } from "@/application/services/state-managers";
import { DomainCtx } from "@/domain/booking";
import {
  cmsAdapter,
  Customer,
  SpecializedDomain,
} from "@/infraestructure/adapters/cms";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { formatSagaOutput } from "@/application/patterns";

export const processOrder = async (ctx: DomainCtx) => {
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
      error: "Customer does not exist",
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
  await productOrderStateManager.resetRouterHistory(orderKey);

  return { success: true, data: result };
};

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

const orderProcessPrompt = (domain: SpecializedDomain) => {
  return `

  `.trim();
};

/**
 *
 * @param ctx
 * @returns
 */
export const processOrderAgent = async (ctx: DomainCtx) => {
  //
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;

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
    true,
  );

  return formatSagaOutput(finalResponse, "order completed ✅", {
    systemPrompt,
  });
};
