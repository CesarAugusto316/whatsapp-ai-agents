import { FMStatus } from "../booking";
import { OrderSchema } from "./parsers/schema";

export interface ProductOrderState extends OrderSchema {
  id: string;
  status: FMStatus;
  customerId: string;
  businessId: string;
  attempts: number;
}
