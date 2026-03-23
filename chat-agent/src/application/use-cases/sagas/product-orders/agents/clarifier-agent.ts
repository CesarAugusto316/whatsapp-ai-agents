import { formatSagaOutput } from "@/application/patterns";
import { productOrderStateManager } from "@/application/services/state-managers";
import { businessInfoChunck, DomainCtx } from "@/domain/booking";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { RouterOutput } from "./router-agent";
import { BookingSagaResult } from "../../booking/booking-saga";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { ragService } from "@/application/services/rag";
import { InformationalIntentKey } from "@/application/services/pomdp";

/**
 *
 * @param ctx
 * @param chatHistory
 * @returns
 */
export const clarifierAgent = async (
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
  routerAgent: RouterOutput,
): Promise<BookingSagaResult> => {
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;

  const limit = 1;
  const { points } = await ragService.searchIntent(
    ctx.customerMessage,
    ["informational"], // ej: ["informational", "booking", "products"],
    domain,
    limit,
    0.7,
  );

  const intent = points[0].payload;

  if (intent.module === "informational") {
    const key = intent.intentKey as InformationalIntentKey;
    const systemPrompt = businessInfoChunck(key, ctx);
    const ASSISTANT_MSG = await aiAdapter.handleChatMessage({
      systemPrompt,
      msg: ctx.customerMessage,
      chatHistory,
      useAuxModel: true,
    });
    await chatHistoryAdapter.push(
      ctx.chatKey,
      ctx.customerMessage,
      ASSISTANT_MSG,
    );
    return formatSagaOutput(
      ASSISTANT_MSG,
      intent?.intentKey, // optional
      { systemPrompt },
    );
  }

  const vocab = DOMAIN_VOCABULARY[domain];
  const productExample1 = vocab.productExamples[0];
  const productExample2 = vocab.productExamples[1] || productExample1;
  const productExample3 = vocab.productExamples[2] || productExample1;

  const systemPrompt = `
    Eres un asistente de clarificación para un ${vocab.greetingContext}. Tu única función es hacer preguntas cortas y amables para entender qué quiere el usuario.

    ## CONTEXTO
    El usuario envió un mensaje ambiguo (ej: "${productExample1}", "${productExample2}") y no sabemos si quiere:
    1. **BUSCAR/EXPLORAR** ${vocab.productPlural} (ver el ${vocab.menuWord}, preguntar qué hay)
    2. **GESTIONAR SU ${vocab.orderWord}** (agregar, quitar, modificar, ver, confirmar)

    ## TU OBJETIVO
    Hacer **UNA sola pregunta corta** que ayude al usuario a clarificar su intención para que el router pueda derivar correctamente.

    ## REGLAS

    1. **SÉ BREVE**: Máximo 1-2 oraciones
    2. **OFRECE LAS 2 OPCIONES**: ¿Quiere ver ${vocab.productPlural}? ¿O gestionar su ${vocab.orderWord}?
    3. **USA PALABRAS CLAVE**: Usa "ver", "ver el menú", "agregar", "gestionar" (el router las reconoce)
    4. **NO ASUMAS**: No asumas que quiere buscar o agregar
    5. **USA EL CONTEXTO**: Si ya vio ${vocab.productPlural}, pregunta si quiere agregar al ${vocab.orderWord}
    6. **EVITA AMBIGÜEDAD**: No preguntes "¿quieres hacer algo?" (demasiado vago)

    ## EJEMPLOS

    Usuario: "${productExample3}"
    → "¿Quieres ver qué ${productExample3} tenemos o quieres gestionar tu ${vocab.orderWord} (agregar, quitar, etc.)?"

    Usuario: "${productExample2}"
    → "¿Quieres ver el ${vocab.menuWord} de ${productExample2} o quieres agregar una ${productExample2} a tu ${vocab.orderWord}?"

    Usuario: "Quiero eso" (después de ver ${vocab.productPlural})
    → "¿Quieres agregar ${vocab.productName} a tu ${vocab.orderWord}?"

    Usuario: "Ver" (ambiguo)
    → "¿Quieres ver el ${vocab.menuWord} o quieres ver lo que ya tienes en tu ${vocab.orderWord}?"

    ## OUTPUT
    Responde ÚNICAMENTE con tu pregunta de clarificación. Nada más.
  `.trim();

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory ?? []),
    { role: "user", content: userMessage },
  ];

  const response = await aiAdapter.generateText({
    messages,
    useAuxModel: true,
    temperature: 0,
  });

  await chatHistoryAdapter.push(ctx.chatKey, userMessage, response);
  await productOrderStateManager.saveRouterHistory(ctx.productOrderKey, {
    agent: routerAgent,
    userMessage,
  });

  return formatSagaOutput(response, "clarifier agent", { systemPrompt });
};
