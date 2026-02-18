import type { Schemas } from "@qdrant/js-client-rest";
import type { Product } from "../cms";
import {
  AllDomainKind,
  IntentExampleKey,
  ModuleKind,
  RequiredConfirmation,
  SpecializedDomain,
} from "@/application/services/pomdp";

export type IntentPayload = {
  text: string;
  module: ModuleKind;
  lang: string;
  domain: AllDomainKind;
  requiresConfirmation: RequiredConfirmation;
  intentKey: IntentExampleKey;
};

export interface QuadrantPoint<T> {
  id: string | number;
  version: number;
  score: number;
  payload: T;
  vector: Schemas["VectorStructOutput"] | (Record<string, unknown> | null);
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
    activeModules: ModuleKind[],
    lang: string,
    specializedDomain: SpecializedDomain,
    limit: number,
    threshold: number,
  ): Promise<{ points: QuadrantPoint<IntentPayload>[] }>;

  deleteIntents(): Promise<boolean>;

  deleteCollections(): Promise<void>;
}
