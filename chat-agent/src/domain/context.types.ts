import { Business, Customer } from "@/infraestructure/adapters/cms";
import { DomainKinds } from "@/application/services/rag";

interface CommonProps<T> {
  session: string; // whatsapp sessionId
  whatsappEvent: string;
  businessId: string;
  business: Business;
  customer?: Customer;
  customerPhone: string;
  customerMessage: string;
  chatKey: string;
  intentKey: string;
  activeDomains: DomainKinds[];
  // statefull object
  intentState?: {
    type: T;
    isConfirmed: boolean;
  };
}

// this changes for any domain
export interface DomainProps<
  BState,
  EState,
  Intent,
> extends CommonProps<Intent> {
  bookingKey: string;
  bookingState?: Partial<BState>; // statefull object
  productOrderKey: string;
  productOrderState?: Partial<EState>; // statefull object
}
