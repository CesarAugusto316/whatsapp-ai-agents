import { BookingState } from "./booking/booking.types";
import { DomainProps } from "../context.types";
import { Context } from "hono";

export type RestaurantProps = DomainProps<
  BookingState,
  {} // ProductOrderState
>;

export interface RestaurantCtx extends Context {
  Variables: RestaurantProps;
}
