import { CTX, CtxState } from "@/types/hono.types";
import { Handler } from "hono/types";
import { initChatFlow } from "./chat-flow";

/**
 *
 * @param ctx
 * @param next
 * @returns
 */
export const aiTestHandler: Handler<CTX> = async (ctx) => {
  const args = {
    RESERVATION_CACHE: ctx.get("RESERVATION_CACHE"),
    business: ctx.get("business"),
    customerMessage: ctx.get("customerMessage"),
    customerPhone: ctx.get("customerPhone"),
    customer: ctx.get("customer"),
    chatKey: ctx.get("chatKey"),
    reservationKey: ctx.get("reservationKey"),
  } as CtxState;

  return ctx.json({ received: true, text: await initChatFlow(args) });
};
