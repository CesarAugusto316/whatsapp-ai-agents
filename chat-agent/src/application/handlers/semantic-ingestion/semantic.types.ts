export type SemanticIngestionRequest = {
  docId: string;
  collection: "businesses" | "products" | "businesses-media" | "products-media";
  businessId: string;
  operation: "create" | "update" | "delete";
};
