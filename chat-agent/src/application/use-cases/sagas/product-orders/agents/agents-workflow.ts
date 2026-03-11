import { DomainCtx } from "@/domain/booking";
import { BookingSagaResult } from "@/application/use-cases/sagas/booking/booking-saga";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { routerAgent } from "./router-agent";
import { cartAgent } from "./cart-agent";
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

  // 2. CART AGENT
  if (router === "cart") {
    return cartAgent(ctx, chatHistory);
  }

  // 3. SEARCH AGENT
  return searchAgent(ctx, chatHistory);
}
