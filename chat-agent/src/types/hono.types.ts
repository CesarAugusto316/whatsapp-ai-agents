import { Context } from "hono";
import { Business, Customer } from "./business/cms-types";
import { ReserveProcess } from "@/ai-agents/agent.types";

export interface CTX extends Context {
  Variables: {
    whatsappEvent: string;
    businessId: string;
    business: Business;
    customerId: string;
    customer?: Customer;
    session: string;
    customerPhone: string;
    customerMessage: string;
    chatKey: string;
    reservationKey: string;
    currentReservation: Partial<ReserveProcess> | null;
  };
}
