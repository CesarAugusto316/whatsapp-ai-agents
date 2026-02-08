import { BookingState } from "./booking/booking.types";
import { ContextProps } from "../context.types";
import { Context } from "hono";

export type RestaurantProps = ContextProps<
  BookingState,
  {} // ProductOrderState
>;

export interface RestaurantCtx extends Context {
  Variables: RestaurantProps;
}
