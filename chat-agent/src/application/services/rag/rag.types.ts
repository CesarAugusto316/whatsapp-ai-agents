/**
 *
 * @todo delete "transversal" in the future
 */
export type ModuleKind =
  | "restaurant"
  | "booking"
  | "erotic"
  | "real-state"
  | "informational";

export interface IntentExample<I extends string> {
  intent: I;
  module: ModuleKind;
  requiresConfirmation?: boolean;
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
