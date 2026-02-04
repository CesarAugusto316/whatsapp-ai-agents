import type { Schemas } from "@qdrant/js-client-rest";
import type { Product } from "../cms";

export interface IVectorAdapter {
  ensureCollections(): Promise<void>;
  dimension: number;

  // -------- Products --------

  upsertProduct(
    id: string,
    vector: number[],
    payload: Partial<Product>,
  ): Promise<Schemas["UpdateResult"]>;

  deleteProduct(id: string): Promise<Schemas["UpdateResult"]>;

  deleteProductsByBusiness(
    businessId: string,
  ): Promise<Schemas["UpdateResult"]>;

  searchProducts(
    vector: number[],
    businessId: string,
    limit: number,
    threshold: number,
  ): Promise<Schemas["QueryResponse"]>;

  // -------- Intents --------

  upsertIntents(points: any[]): Promise<Schemas["UpdateResult"]>;

  queryIntents(
    vector: number[],
    domains: string[],
    lang: string,
    limit: number,
    threshold: number,
  ): Promise<Schemas["QueryResponse"]>;
}
