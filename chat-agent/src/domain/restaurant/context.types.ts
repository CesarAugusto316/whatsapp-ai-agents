import { Business, Customer } from "@/infraestructure/http/cms/cms-types";
import { ReservationState } from "./reservations/reservation.types";

export type ReservationCtx = {
  whatsappEvent: string;
  businessId: string;
  business: Business;
  customer?: Customer;
  session: string;
  customerPhone: string;
  customerMessage: string;
  chatKey: string;
  reservationKey: string;
  RESERVATION_CACHE: Partial<ReservationState> | undefined;
};
