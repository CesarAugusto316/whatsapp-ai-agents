import { Handler } from "hono/types";
import { RestaurantCtx, RestaurantProps } from "@/domain/restaurant";
import { reservationStateOrchestrator } from "@/application/use-cases/sagas";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const testBookingHandler: Handler<RestaurantCtx> = async (c) => {
  const context = {
    bookingState: c.get("bookingState"),
    business: c.get("business"),
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    customer: c.get("customer"),
    chatKey: c.get("chatKey"),
    reservationKey: c.get("reservationKey"),
    activeDomains: c.get("activeDomains"),
    intentKey: c.get("intentKey"),
    intentState: c.get("intentState"),
    businessId: c.get("businessId"),
  } as RestaurantProps;

  return c.json(await reservationStateOrchestrator(context));
};
