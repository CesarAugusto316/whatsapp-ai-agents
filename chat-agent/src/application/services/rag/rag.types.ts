export type DomainKinds =
  | "restaurant"
  | "booking"
  | "erotic"
  | "real-state"
  | "transversal";

export interface SemanticIntent<I extends string> {
  intent: I;
  domain: DomainKinds;
  lang: "es" | "en";
  examples: string[];
}

export type SyncStateRequest = {
  docId: string;
  collection:
    | "businesses"
    | "businesses-media"
    | "appointments"
    | "products"
    | "product-orders"
    | "products-media";
  businessId: string;
  operation: "create" | "update" | "delete";
};
