import whatsappService from "@/services/whatsapp.service";
import { CTX, CtxState } from "@/types/hono.types";
import { Handler } from "hono/types";
import { initFlow } from "./flow";

export const aiAgentHandler: Handler<CTX> = async (ctx) => {
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
  const flowResponse = await whatsappService.beforeSend(
    {
      session: state.session,
      chatId: state.customerPhone,
    },
    async () => {
      return initFlow(state);
    },
  );

  // 2. Send AI response to customer
  await whatsappService.sendText({
    chatId: state.customerPhone,
    text: flowResponse,
    session: state.session,
  });

  // 3. Return response
  return ctx.json({ received: true, message: "AI Agent Response" });
};
