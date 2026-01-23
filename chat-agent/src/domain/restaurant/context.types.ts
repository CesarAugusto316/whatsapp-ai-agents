import { Business, Customer } from "@/infraestructure/http/cms";
import { ReservationState } from "./reservations/reservation.types";

export type RestaurantCtx = {
  whatsappEvent: string;
  businessId: string;
  business: Business;
  customer?: Customer;
  session: string;
  customerPhone: string;
  customerMessage: string;
  chatKey: string;
  reservationKey: string;
  RESERVATION_STATE: Partial<ReservationState> | undefined;
};
