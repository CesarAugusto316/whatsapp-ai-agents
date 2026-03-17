import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { formatSagaOutput } from "@/application/patterns";
import { DomainCtx, WRITING_STYLE } from "@/domain/booking";
import { productOrderStateManager } from "@/application/services/state-managers";

function getConfirmationQuestions(orderWord: string): string[] {
  return [
    `¿Confirmas tu ${orderWord} con estos productos?`,
    `¿Te gustaría confirmar este ${orderWord}?`,
    `¿Procedemos con este ${orderWord}?`,
    `¿Estás seguro de que quieres confirmar tu ${orderWord}?`,
    `¿Confirmamos tu ${orderWord} así?`,
    `¿Todo correcto? ¿Confirmo tu ${orderWord}?`,
    `¿Te parece bien? ¿Confirmo el ${orderWord}?`,
  ];
}

function getEmptyCartMessages(
  vocab: (typeof DOMAIN_VOCABULARY)[SpecializedDomain],
): string[] {
  return [
    `Veo que tu ${vocab.orderWord} está vacío. ¿Te gustaría que te ayude a buscar algún ${vocab.productName} o quieres agregar algo?`,
    `Aún no has agregado productos a tu ${vocab.orderWord}. ¿Quieres ver nuestro ${vocab.menuWord} o hay algo específico que te gustaría agregar?`,
    `Tu ${vocab.orderWord} no tiene productos todavía. ¿Deseas buscar algún ${vocab.productName} o prefieres que te sugiera algo?`,
  ];
}

function buildEmptyCartPrompt(
  vocab: (typeof DOMAIN_VOCABULARY)[SpecializedDomain],
): string {
  const message = getRandomEmptyCartMessage(vocab);

  return `
    Eres un asistente amable que informa al usuario que su ${vocab.orderWord} está vacío.

    ${WRITING_STYLE}

    ## TU TAREA

    1. **Informa de forma amable** que no hay productos en el ${vocab.orderWord}
    2. **Ofrece ayuda** para buscar o agregar productos
    3. **Cierra con una pregunta** para continuar

    ## EJEMPLO DE RESPUESTA

    "${message}"

    ## IMPORTANTE
    - Sé amable y no culpes al usuario
    - Ofrece ayuda concreta (buscar o agregar)
    - No menciones JSON, herramientas o detalles técnicos
  `.trim();
}

function buildProductsSummary(
  products: Array<{
    name: string;
    quantity: number;
    price?: number | null;
    isAvailable?: boolean;
  }>,
) {
  let total = 0;
  const summary = products
    .map((item) => {
      const price = item.price ?? 0;
      const itemTotal = price * item.quantity;
      total += itemTotal;
      const isAvailable = item.isAvailable !== false;

      if (!isAvailable) {
        return `  • ${item.quantity}× ${item.name} - $${price} c/u = $${itemTotal} ⚠️ AGOTADO`;
      }
      return `  • ${item.quantity}× ${item.name} - $${price} c/u = $${itemTotal}`;
    })
    .join("\n");

  return { summary, total };
}

function getRandomConfirmationQuestion(orderWord: string): string {
  const questions = getConfirmationQuestions(orderWord);
  const idx = Math.floor(Math.random() * questions.length);
  return questions[idx];
}

function getRandomEmptyCartMessage(
  vocab: (typeof DOMAIN_VOCABULARY)[SpecializedDomain],
): string {
  const messages = getEmptyCartMessages(vocab);
  const idx = Math.floor(Math.random() * messages.length);
  return messages[idx];
}

/**
 * Genera un resumen natural del pedido con precios y pregunta de confirmación
 */
function createConfirmationPrompt(
  domain: SpecializedDomain,
  products: Array<{
    name: string;
    quantity: number;
    price?: number | null;
    isAvailable?: boolean;
  }>,
): string {
  const vocab = DOMAIN_VOCABULARY[domain];

  if (products.length === 0) {
    return buildEmptyCartPrompt(vocab);
  }

  const { summary, total } = buildProductsSummary(products);
  const randomQuestion = getRandomConfirmationQuestion(vocab.orderWord);
  const warning = products.some((p) => p.isAvailable === false)
    ? "\n\n⚠️ Algunos productos están agotados y no podrán ser procesados."
    : "";

  return `
    Eres un asistente amable que confirma el ${vocab.orderWord} del usuario de forma natural y clara.

    ${WRITING_STYLE}

    ## RESUMEN DEL ${vocab.orderWord.toUpperCase()}

    ${summary}

    **TOTAL: $${total}**${warning}

    ## TU TAREA

    1. **Presenta el resumen** de forma natural y amable
    2. **Menciona el total** claramente
    3. **Si hay productos agotados**, menciónalo brevemente
    4. **Cierra con una pregunta de confirmación** clara y directa

    ## EJEMPLOS DE RESPUESTA

    "Perfecto, tu ${vocab.orderWord} incluye:
    ${summary}

    Total: $${total}${warning}

    ${randomQuestion}"

    ## IMPORTANTE
    - El total debe verse destacado
    - La pregunta de confirmación debe ser explícita
    - No menciones JSON, herramientas o detalles técnicos
  `.trim();
}

export const confirmationAgent = async (ctx: DomainCtx) => {
  //
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;

  const searchProducts = ctx.productOrderState?.searchedProducts ?? [];
  const products = ctx.productOrderState?.products ?? [];

  // Enriquecer productos con información de disponibilidad y precio
  const summaryProducts = products.map((item) => {
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

  const systemPrompt = createConfirmationPrompt(domain, summaryProducts);

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
  return formatSagaOutput(finalResponse, "confirmation agent", {
    systemPrompt,
  });
};
