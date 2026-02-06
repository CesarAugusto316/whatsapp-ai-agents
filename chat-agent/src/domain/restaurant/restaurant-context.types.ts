import { ReservationState } from "./reservations/reservation.types";
import { DomainCtx, DomainPropsCtx } from "../context.types";
import { SpecializedSemanticIntent } from "@/application/services/rag";

export interface IntentProp {
  type: SpecializedSemanticIntent;
  isConfirmed: boolean;
}
export type RestaurantCtx = DomainCtx<ReservationState, "">;
export type RestaurantProps = DomainPropsCtx<ReservationState, "">;
