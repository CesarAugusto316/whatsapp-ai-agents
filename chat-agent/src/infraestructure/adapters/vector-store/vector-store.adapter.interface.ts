import type { Schemas } from "@qdrant/js-client-rest";
import type { Product } from "../cms";

export type IntentPayload = {
  text: string;
  module: string;
  lang: string;
  intent: string;
};

export interface QuadrantPoint<T> {
  id: string | number;
  version: number;
  score: number;
  payload?: T;
  vector?: Schemas["VectorStructOutput"] | (Record<string, unknown> | null);
  shard_key?: Schemas["ShardKey"] | (Record<string, unknown> | null);
  order_value?: Schemas["OrderValue"] | (Record<string, unknown> | null);
}

export interface IVectorStoreAdapter {
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

  upsertIntents(
    points: {
      id: string;
      vector: number[] | number[][];
      payload: IntentPayload;
    }[],
  ): Promise<Schemas["UpdateResult"]>;

  queryIntents(
    vector: number[],
    activeModules: string[],
    lang: string,
    limit: number,
    threshold: number,
  ): Promise<{ points: QuadrantPoint<IntentPayload>[] }>;

  deleteIntents(): Promise<boolean>;

  deleteCollections(): Promise<void>;
}
