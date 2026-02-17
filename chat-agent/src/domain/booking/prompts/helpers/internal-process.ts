import { DomainKind, ModuleKind } from "@/application/services/pomdp";

type Guidance = {
  name: ModuleKind;
  domains: DomainKind[];
  requiredUserData: string[];
};

export const guidanceAboutCriticProcess: Guidance[] = [
  {
    name: "booking",
    domains: ["restaurant", "medical", "real-estate"],
    requiredUserData: [
      "name",
      "number of people (if aplicable)",
      "start datetime",
      "end datetime (optional)",
    ],
  },
  {
    name: "orders",
    domains: ["restaurant", "retail"],
    requiredUserData: [
      "name of the product",
      "quantity",
      "delivery address (if active)",
      "recojer al local (if active)",
    ],
  },
];
