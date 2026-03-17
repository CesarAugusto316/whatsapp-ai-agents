import { DomainCtx } from "@/domain/booking";
import { BookingSagaResult } from "@/application/use-cases/sagas/booking/booking-saga";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { routerAgent } from "./router-agent";
import { cartManagerAgent } from "./cart-agent";
import { searchAgent } from "./search-agent";
import { clarifierAgent } from "./clarifier-agent";
import { confirmationAgent } from "./ask-confirmation";
import { processOrderAgent } from "./confirmation-agent";

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

  // 6. PROCESS ORDER AGENT
  if (hasAskedForConfirmation) {
    return processOrderAgent(ctx, chatHistory);
  }

  // 1. ROUTER AGENT
  const router = await routerAgent(ctx, chatHistory);

  // 2. CLARIFIER AGENT
  if (router === "ask_clarification") {
    return clarifierAgent(ctx, chatHistory, router);
  }

  // 3. CONFIRMATION AGENT
  if (router === "ask_final_confirmation") {
    return confirmationAgent(ctx);
  }

  // 4. CART AGENT
  if (router === "cart_agent") {
    return cartManagerAgent(ctx, chatHistory, router);
  }

  // 5. SEARCH AGENT
  return searchAgent(ctx, chatHistory, router);
}
