import { Context } from "hono";
import { Business, Customer } from "@/infraestructure/adapters/cms";
import { DomainKinds } from "@/application/services/rag";

interface CommonProps {
  session: string; // whatsapp sessionId
  whatsappEvent: string;
  businessId: string;
  business: Business;
  customer?: Customer;
  customerPhone: string;
  customerMessage: string;
  chatKey: string;
}

// this changes for any domain
export interface DomainPropsCtx<State, Intent> extends CommonProps {
  intentKey: string;
  reservationKey: string;
  bookingState?: Partial<State>; // statefull object
  intentState?: {
    // statefull object
    type: Intent;
    isConfirmed: boolean;
  };
  activeDomains: DomainKinds[];
}

export interface DomainCtx<State, Intent> extends Context {
  Variables: DomainPropsCtx<State, Intent>;
}
