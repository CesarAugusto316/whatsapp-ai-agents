import { DomainKind, ModuleKind } from "@/application/services/pomdp";
import { bookingSchema } from "../../input-parser";

type Guidance = {
  name: ModuleKind;
  domains: DomainKind[];
  requiredUserData: string[];
};

bookingSchema

export const internalProcesses: Guidance[] = [
  {
    name: "booking",
    domains: ["restaurant", "medical", "real-estate"],
    requiredUserData: [
      "name",
      "number of people (if aplicable)",
      "start datetime",
      "end datetime (optional)",
      "confirmacion (given by the system at the end)",
    ],
  },
  {
    name: "orders",
    domains: ["restaurant", "retail"],
    requiredUserData: [
      "name of the product",
      "quantity",
      "total price (given at the end)",
      "delivery address (if active)",
      "recojer al local (if active)",
      "confirmacion (given by the system at the end)",
    ],
  },
];
