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
