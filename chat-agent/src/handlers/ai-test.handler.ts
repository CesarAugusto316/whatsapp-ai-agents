import { CTX, AppContext } from "@/types/hono.types";
import { Handler } from "hono/types";
import { runChatSession } from "./chat-flow";

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
  } as AppContext;

  return ctx.json({ received: true, text: await runChatSession(args) });
};
