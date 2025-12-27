import whatsappService from "@/services/whatsapp.service";
import { CTX, CtxState } from "@/types/hono.types";
import { Handler } from "hono/types";
import { initChatFlow } from "./chat-flow";

export const aiWhatsappHandler: Handler<CTX> = async (ctx) => {
  const state = {
    session: ctx.get("session"),
    whatsappEvent: ctx.get("whatsappEvent"),
    RESERVATION_CACHE: ctx.get("RESERVATION_CACHE"),
    customerMessage: ctx.get("customerMessage"),
    customerPhone: ctx.get("customerPhone"),
    business: ctx.get("business"),
    customer: ctx.get("customer"),
    businessId: ctx.get("businessId"),
    chatKey: ctx.get("chatKey"),
    reservationKey: ctx.get("reservationKey"),
  } as CtxState;

  if (state.whatsappEvent !== "message") {
    return ctx.json({ message: "Invalid event" });
  }

  // 1. Set message as seen & call the core-flow & get a response
  const chatResponse = await whatsappService.beforeSend(
    {
      session: state.session,
      chatId: state.customerPhone,
    },
    async () => initChatFlow(state),
  );

  // 2. Send AI response to customer
  await whatsappService.sendText({
    chatId: state.customerPhone,
    text: chatResponse,
    session: state.session,
  });

  // 3. Return response
  return ctx.json({ received: true, message: "AI Agent Response" });
};
