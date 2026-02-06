import { Handler } from "hono/types";
import { RestaurantCtx, RestaurantProps } from "@/domain/restaurant";
import { whatsappSagaOrchestrator } from "@/application/use-cases/sagas";

export const whatsappReservationHandler: Handler<RestaurantCtx> = async (c) => {
  const ctx = {
    session: c.get("session"),
    whatsappEvent: c.get("whatsappEvent"),
    RESERVATION_STATE: c.get("RESERVATION_STATE"),
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    business: c.get("business"),
    customer: c.get("customer"),
    businessId: c.get("businessId"),
    chatKey: c.get("chatKey"),
    reservationKey: c.get("reservationKey"),
    INTENT: c.get("INTENT"),
    intentKey: c.get("intentKey"),
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
