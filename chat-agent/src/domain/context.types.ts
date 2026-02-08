import { Business, Customer } from "@/infraestructure/adapters/cms";
import { BeliefState, ModuleKind } from "@/application/services/rag";

interface CommonProps {
  session: string; // whatsapp sessionId
  whatsappEvent: string;
  businessId: string;
  business: Business;
  customer?: Customer;
  customerPhone: string;
  customerMessage: string;
  chatKey: string;
  activeModules: ModuleKind[];

  /**
   * @link https://claude.ai/share/9ed2864f-5bc9-4c5a-a432-da045017703f
   * @link https://www.geeksforgeeks.org/artificial-intelligence/partially-observable-markov-decision-process-pomdp-in-ai/
   */
  beliefKey: string; // for redis
  beliefState?: BeliefState;
}

// this changes for any domain
export interface ContextProps<BState, EState> extends CommonProps {
  bookingKey: string;
  bookingState?: Partial<BState>; // statefull object
  productOrderKey: string;
  productOrderState?: Partial<EState>; // statefull object
}
// ProductOrder maybe changed to Resturant|Erotic in the future
