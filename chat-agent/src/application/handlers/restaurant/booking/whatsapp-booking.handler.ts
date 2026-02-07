import { Handler } from "hono/types";
import { RestaurantCtx, RestaurantProps } from "@/domain/restaurant";
import { whatsappSagaOrchestrator } from "@/application/use-cases/sagas";

export const whatsappBookingHandler: Handler<RestaurantCtx> = async (c) => {
  const ctx = {
    session: c.get("session"),
    whatsappEvent: c.get("whatsappEvent"),
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    business: c.get("business"),
    customer: c.get("customer"),
    businessId: c.get("businessId"),
    chatKey: c.get("chatKey"),
    reservationKey: c.get("reservationKey"),
    bookingState: c.get("bookingState"),
    intentState: c.get("intentState"),
    intentKey: c.get("intentKey"),
    activeDomains: c.get("activeDomains"),
  } satisfies RestaurantProps;

  if (ctx.whatsappEvent !== "message") {
    return c.json({ message: "Invalid event" });
  }

  const { bag, lastStepResult } = await whatsappSagaOrchestrator(ctx);
  const message =
    bag?.["execute:reservationFlow"].text ||
    lastStepResult?.compensate?.result ||
    "Ocurrio un error, vuelva a intentarlo más tarde";

  return c.json({
    received: true,
    message,
  });
};
