import { formatForWhatsApp } from "@/helpers/format-for-whatsapp";
import whatsAppService from "@/services/whatsapp.service";
import { CTX, AppContext } from "@/types/hono.types";
import { runReservationWorkflow } from "@/workflows/reservations/reservation.workflow";
import { Handler } from "hono/types";

export const aiWhatsappHandler: Handler<CTX> = async (ctx) => {
  const appContext = {
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
  } satisfies AppContext;

  if (appContext.whatsappEvent !== "message") {
    return ctx.json({ message: "Invalid event" });
  }

  // 1. Set message as seen & call the core-flow & get a response
  const textResponse: string = await whatsAppService.beforeSend(
    {
      session: appContext.session,
      chatId: appContext.customerPhone,
    },
    async () => runReservationWorkflow(appContext),
  );

  // 2. Send AI response to customer
  const whatsappResponse = {
    chatId: appContext.customerPhone,
    text: formatForWhatsApp(textResponse),
    session: appContext.session,
  };
  await whatsAppService.sendText(whatsappResponse);

  // 3. Return response
  return ctx.json({ received: true, message: whatsappResponse.text });
};
