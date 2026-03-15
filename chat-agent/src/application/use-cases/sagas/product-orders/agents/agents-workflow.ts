import { DomainCtx } from "@/domain/booking";
import { BookingSagaResult } from "@/application/use-cases/sagas/booking/booking-saga";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { clarifierAgent, routerAgent } from "./router-agent";
import { cartManagerAgent } from "./cart-agent";
import { searchAgent } from "./search-agent";

/**
 * Maneja el flujo completo de tool calling para pedidos de productos
 */
export async function productOrderWorkflow(
  ctx: DomainCtx,
): Promise<BookingSagaResult> {
  //
  const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);

  // 1. ROUTER AGENT
  const router = await routerAgent(ctx, chatHistory);

  if (router === "ask_clarification") {
    return clarifierAgent(ctx, chatHistory, router);
  }

  // 2. CART AGENT (incluye ask_final_confirmation)
  if (router === "cart_agent" || router === "ask_final_confirmation") {
    return cartManagerAgent(ctx, chatHistory, router);
  }

  // 3. SEARCH AGENT
  return searchAgent(ctx, chatHistory, router);
}
