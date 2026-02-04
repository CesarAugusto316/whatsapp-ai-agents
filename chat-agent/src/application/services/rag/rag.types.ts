export interface SemanticIntent<Intent extends string, Domain extends string> {
  intent: Intent;
  domain: Domain;
  lang: "es" | "en";
  examples: string[];
}

export type SemanticIngestionRequest = {
  docId: string;
  collection:
    | "businesses"
    | "appointments"
    | "products"
    | "product-orders"
    | "businesses-media"
    | "products-media";
  businessId: string;
  operation: "create" | "update" | "delete";
};
