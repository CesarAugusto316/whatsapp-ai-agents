import { Product, SpecializedDomain } from "@/infraestructure/adapters/cms";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { formatSagaOutput } from "@/application/patterns";
import { DomainCtx, WRITING_STYLE } from "@/domain/booking";
import { productOrderStateManager } from "@/application/services/state-managers";
import { RouterOutput } from "./router-agent";

/**
 *
 * @param domain
 * @param cart
 * @returns
 */
function summary(domain: SpecializedDomain, cart: string): string {
  const vocab = DOMAIN_VOCABULARY[domain];
  return `
    Eres un asistente amable que convierte acciones técnicas en mensajes naturales para el usuario.

    ${WRITING_STYLE}

    CONTEXT:

    cart: ${cart}

    Instrucciones:
    - Sé breve (1-2 oraciones)
    - No menciones JSON, herramientas o detalles técnicos
    - Usa el contexto del ${vocab.orderWord} del usuario
    - Varía las preguntas de cierre para que no suenen robóticas
`.trim();
}

export const confirmationAgent = async (
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
) => {
  //
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;

  const searchProducts = ctx.productOrderState?.searchedProducts ?? [];
  const products = ctx.productOrderState?.products ?? [];

  const summayProducts = products.map((item) => {
    const foundProduct = searchProducts.find((p) => p.id === item.id);

    const payload = {
      estimatedProcessingTime: foundProduct?.payload?.estimatedProcessingTime,
      price: foundProduct?.payload?.price,
      isAvailable: foundProduct?.payload?.enabled,
    };
    return {
      ...item,
      ...payload,
    };
  });

  const systemPrompt = summary(domain, JSON.stringify(summayProducts));

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory ?? []),
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

  return formatSagaOutput(finalResponse, "confirmation agent", {
    systemPrompt,
  });
};
