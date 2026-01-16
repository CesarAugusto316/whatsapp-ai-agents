import { Handler } from "hono/types";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import { DomainCtx } from "@/domain/context.types";
import { reservationSagaOrchestrator } from "@/application/use-cases/sagas/reservations/reservation-flow-orchestrator";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const testReservationHandler: Handler<DomainCtx<RestaurantCtx>> = async (
  c,
) => {
  const context = {
    RESERVATION_STATE: c.get("RESERVATION_STATE"),
    business: c.get("business"),
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    customer: c.get("customer"),
    chatKey: c.get("chatKey"),
    reservationKey: c.get("reservationKey"),
  } as RestaurantCtx;

  return c.json({
    received: true,
    text: await reservationSagaOrchestrator(context),
  });
};
