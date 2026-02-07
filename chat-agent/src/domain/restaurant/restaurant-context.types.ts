import { BookingState } from "./booking/booking.types";
import { DomainProps } from "../context.types";
import {
  RestaurantIntentKey,
  BookingIntentKey,
  TransversalIntentKey,
} from "@/application/services/rag";
import { Context } from "hono";

export type RestaurantIntentType =
  | TransversalIntentKey
  | RestaurantIntentKey
  | BookingIntentKey;

export type RestaurantIntent = {
  type: RestaurantIntentType;
  isConfirmed: boolean;
};

export type RestaurantProps = DomainProps<
  BookingState,
  {}, // Ecommerce for restaura
  RestaurantIntentType
>;

export interface RestaurantCtx extends Context {
  Variables: RestaurantProps;
}
