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
