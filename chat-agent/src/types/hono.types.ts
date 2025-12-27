import { Context } from "hono";
import { Business, Customer } from "./business/cms-types";
import { ReservationState } from "@/ai-agents/agent.types";

export type CtxState = {
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

export interface CTX extends Context {
  Variables: CtxState;
}
