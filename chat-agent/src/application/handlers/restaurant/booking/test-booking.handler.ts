import { Handler } from "hono/types";
import { RestaurantCtx, RestaurantProps } from "@/domain/restaurant";
import { bookingStateOrchestrator } from "@/application/use-cases/sagas";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const testBookingHandler: Handler<RestaurantCtx> = async (c) => {
  const context = {
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    customer: c.get("customer"),
    chatKey: c.get("chatKey"),
    businessId: c.get("businessId"),
    business: c.get("business"),
    activeDomains: c.get("activeDomains"),
    intentKey: c.get("intentKey"),
    intentState: c.get("intentState"),
    bookingKey: c.get("bookingKey"),
    bookingState: c.get("bookingState"),
    productOrderKey: c.get("productOrderKey"),
    productOrderState: c.get("productOrderState"),
  } as RestaurantProps;

  return c.json(await bookingStateOrchestrator(context));
};
