import { QuadrantPoint } from "@/infraestructure/adapters/vector-store";
import { FMStatus } from "../booking";
import { OrderSchema } from "./parsers/schema";
import { Product } from "@/infraestructure/adapters/cms";

export interface ProductOrderState extends OrderSchema {
  id: string;
  status?: FMStatus;
  customerId: string;
  searchedProducts: QuadrantPoint<Partial<Product>>[];
}
