import { BookingState } from "./booking/booking.types";
import { DomainCtx, DomainPropsCtx } from "../context.types";
import {
  RestaurantIntentKey,
  BookingIntentKey,
  TransversalIntentKey,
} from "@/application/services/rag";

export type RestaurantIntentType =
  | TransversalIntentKey
  | RestaurantIntentKey
  | BookingIntentKey;

export type RestaurantIntent = {
  type: RestaurantIntentType;
  isConfirmed: boolean;
};

export type RestaurantCtx = DomainCtx<BookingState, RestaurantIntentType>;

export type RestaurantProps = DomainPropsCtx<
  BookingState,
  RestaurantIntentType
>;
