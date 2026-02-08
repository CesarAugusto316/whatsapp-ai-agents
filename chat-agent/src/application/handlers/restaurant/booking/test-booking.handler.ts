import { Handler } from "hono/types";
import { ModuleCtx, RestaurantCtx } from "@/domain/restaurant";
import { bookingStateOrchestrator } from "@/application/use-cases/sagas";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const testBookingHandler: Handler<ModuleCtx> = async (c) => {
  const context = {
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    customer: c.get("customer"),
    chatKey: c.get("chatKey"),
    businessId: c.get("businessId"),
    business: c.get("business"),
    activeModules: c.get("activeModules"),
    beliefKey: c.get("beliefKey"),
    beliefState: c.get("beliefState"),
    bookingKey: c.get("bookingKey"),
    bookingState: c.get("bookingState"),
    productOrderKey: c.get("productOrderKey"),
    productOrderState: c.get("productOrderState"),
  } as RestaurantCtx;

  return c.json(
    await bookingStateOrchestrator(Object.freeze(structuredClone(context))),
  );
};
