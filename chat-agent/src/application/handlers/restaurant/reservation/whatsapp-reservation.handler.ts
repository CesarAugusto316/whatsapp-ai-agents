import { Handler } from "hono/types";
import { DomainCtx } from "@/domain/context.types";
import { RestaurantCtx } from "@/domain/restaurant";
import { whatsappSagaOrchestrator } from "@/application/use-cases/sagas";

export const whatsappReservationHandler: Handler<
  DomainCtx<RestaurantCtx>
> = async (c) => {
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
  } satisfies RestaurantCtx;

  if (ctx.whatsappEvent !== "message") {
    return c.json({ message: "Invalid event" });
  }

  const { bag } = await whatsappSagaOrchestrator(ctx);

  return c.json({
    received: true,
    message: bag?.["execute:reservationFlow"].text ?? "",
  });
};
