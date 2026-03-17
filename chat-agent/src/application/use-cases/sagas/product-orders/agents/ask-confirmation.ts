import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { formatSagaOutput } from "@/application/patterns";
import { DomainCtx, WRITING_STYLE } from "@/domain/booking";
import { productOrderStateManager } from "@/application/services/state-managers";

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

  // Calcular totales y formatear productos
  let summaryLines: string[] = [];
  let total = 0;
  let hasUnavailable = false;

  products.forEach((item) => {
    const price = item.price ?? 0;
    const itemTotal = price * item.quantity;
    total += itemTotal;
    const isAvailable = item.isAvailable !== false;

    if (!isAvailable) {
      hasUnavailable = true;
      summaryLines.push(
        `  • ${item.quantity}× ${item.name} - $${price} c/u = $${itemTotal} ⚠️ AGOTADO`,
      );
    } else {
      summaryLines.push(
        `  • ${item.quantity}× ${item.name} - $${price} c/u = $${itemTotal}`,
      );
    }
  });

  const productsSummary = summaryLines.join("\n");

  // Variaciones para la pregunta de confirmación
  const confirmationQuestions = [
    `¿Confirmas tu ${vocab.orderWord} con estos productos?`,
    `¿Te gustaría confirmar este ${vocab.orderWord}?`,
    `¿Procedemos con este ${vocab.orderWord}?`,
    `¿Estás seguro de que quieres confirmar tu ${vocab.orderWord}?`,
    `¿Confirmamos tu ${vocab.orderWord} así?`,
    `¿Todo correcto? ¿Confirmo tu ${vocab.orderWord}?`,
    `¿Te parece bien? ¿Confirmo el ${vocab.orderWord}?`,
  ];

  const randomQuestion =
    confirmationQuestions[
      Math.floor(Math.random() * confirmationQuestions.length)
    ];

  const unavailableWarning = hasUnavailable
    ? `\n\n⚠️ Algunos productos están agotados y no podrán ser procesados.`
    : "";

  return `
    Eres un asistente amable que confirma el ${vocab.orderWord} del usuario de forma natural y clara.

    ${WRITING_STYLE}

    ## RESUMEN DEL ${vocab.orderWord.toUpperCase()}

    ${productsSummary}

    **TOTAL: $${total}**${unavailableWarning}

    ## TU TAREA

    1. **Presenta el resumen** de forma natural y amable
    2. **Menciona el total** claramente
    3. **Si hay productos agotados**, menciónalo brevemente
    4. **Cierra con una pregunta de confirmación** clara y directa

    ## EJEMPLOS DE RESPUESTA

    "Perfecto, tu ${vocab.orderWord} incluye:
    ${productsSummary}

    Total: $${total}${unavailableWarning}

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
