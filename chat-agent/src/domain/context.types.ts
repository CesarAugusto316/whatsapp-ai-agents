import { Context } from "hono";
import { Business, Customer } from "@/infraestructure/adapters/cms";

export interface DomainPropsCtx<State, Intent> {
  whatsappEvent: string;
  businessId: string;
  business: Business;
  customer?: Customer;
  session: string;
  customerPhone: string;
  customerMessage: string;
  chatKey: string;
  reservationKey: string;
  RESERVATION_STATE?: Partial<State>;
  INTENT: Intent;
  intentKey: string;
}

export interface DomainCtx<State, Intent> extends Context {
  Variables: DomainPropsCtx<State, Intent>;
}
