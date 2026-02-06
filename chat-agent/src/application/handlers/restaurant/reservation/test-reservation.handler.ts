import { Handler } from "hono/types";
import { RestaurantCtx, RestaurantProps } from "@/domain/restaurant";
import { reservationStateOrchestrator } from "@/application/use-cases/sagas";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const testReservationHandler: Handler<RestaurantCtx> = async (c) => {
  const context = {
    RESERVATION_STATE: c.get("RESERVATION_STATE"),
    business: c.get("business"),
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    customer: c.get("customer"),
    chatKey: c.get("chatKey"),
    reservationKey: c.get("reservationKey"),
  } as RestaurantProps;

  return c.json(await reservationStateOrchestrator(context));
};
