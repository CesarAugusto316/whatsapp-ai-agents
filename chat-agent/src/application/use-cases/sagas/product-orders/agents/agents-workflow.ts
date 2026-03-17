import { businessInfoChunck, DomainCtx } from "@/domain/booking";
import { BookingSagaResult } from "@/application/use-cases/sagas/booking/booking-saga";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { routerAgent } from "./router-agent";
import { cartManagerAgent } from "./cart-agent";
import { searchAgent } from "./search-agent";
import { clarifierAgent } from "./clarifier-agent";
import { ragService } from "@/application/services/rag";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import {
  InformationalIntentKey,
  shouldSkipEmbedding,
} from "@/application/services/pomdp";
import { aiAdapter } from "@/infraestructure/adapters/ai";
import { formatSagaOutput } from "@/application/patterns";
import { confirmationAgent } from "./ask-confirmation";

/**
 * Maneja el flujo completo de tool calling para pedidos de productos
 */
export async function productOrderWorkflow(
  ctx: DomainCtx,
): Promise<BookingSagaResult> {
  //
  const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);
  const hasAskedForConfirmation =
    ctx.productOrderState?.hasAskedForConfirmation ?? false; //

  // when user has confirmed after hasAskedForConfirmation=true debemos ejecutar
  // de forma determinista sin LLM (en la medida de lo posible)
  if (hasAskedForConfirmation) {
    const { skip, kind, msg } = shouldSkipEmbedding(ctx.customerMessage);

    if (
      skip &&
      kind === "conversational-signal" &&
      msg === "signal:affirmation"
    ) {
      //
      // cmsAdapter.createProductOrder
      // return;
    }

    if (skip && kind === "conversational-signal" && msg === "signal:negation") {
      // DEBEMOS ACTUALIZAR: ctx.productOrderState?.hasAskedForConfirmation = false
      // return;
    }

    const limit = 1;
    const domain: SpecializedDomain = ctx.business.general.businessType; // ej: restaurant | retail | real-estate
    const { points } = await ragService.searchIntent(
      ctx.customerMessage,
      ["conversational-signal"], // ej: ["informational", "booking", "products"],
      domain,
      limit,
    );

    const intent = points[0].payload;

    if (intent.module === "conversational-signal") {
      const key = intent.intentKey;
    }

    // USE an LLM to infer intention and other doubts
  }

  // 1. ROUTER AGENT
  const router = await routerAgent(ctx, chatHistory);

  if (router === "ask_clarification") {
    const limit = 1;
    const domain: SpecializedDomain = ctx.business.general.businessType; // ej: restaurant | retail | real-estate
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

    return clarifierAgent(ctx, chatHistory, router);
  }

  if (router === "ask_final_confirmation") {
    return confirmationAgent(ctx);
  }

  // 2. CART AGENT (incluye ask_final_confirmation)
  if (router === "cart_agent") {
    return cartManagerAgent(ctx, chatHistory, router);
  }

  // 3. SEARCH AGENT
  return searchAgent(ctx, chatHistory, router);
}
