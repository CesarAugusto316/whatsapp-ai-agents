import { BookingState } from "../booking/booking.types";
import { ContextProps } from "../context.types";
import { Context } from "hono";

export type RestaurantCtx = ContextProps<
  BookingState,
  {} // ProductOrderState
>;

export interface ModuleCtx extends Context {
  Variables: RestaurantCtx;
}
