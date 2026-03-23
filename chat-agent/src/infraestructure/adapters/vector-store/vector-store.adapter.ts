import { QdrantClient, Schemas } from "@qdrant/js-client-rest";
import { BusinessesMedia, Product, SpecializedDomain } from "../cms";
import {
  IntentPayload,
  IVectorStoreAdapter,
  QuadrantPoint,
} from "./vector-store.adapter.interface";
import { GENERAL_DOMAIN, ModuleKind } from "@/application/services/pomdp";

type EnabledKey = keyof Pick<Product, "enabled">;
type BusinessKey = keyof Pick<Product, "business">;
type LangKey = keyof Pick<IntentPayload, "lang">;
type ModuleKey = keyof Pick<IntentPayload, "module">;
type DomainKey = keyof Pick<IntentPayload, "domain">;

export class VectorStoreAdapter implements IVectorStoreAdapter {
  private client = new QdrantClient({ url: Bun.env.QDRANT_URL });

  constructor(public dimension = 1024) {}

  async ensureCollections() {
    const { collections = [] } = await this.client.getCollections();
    const existing = new Set(collections.map((c) => c.name));

    await this.ensure("business", existing);
    await this.ensureBusinessMedia(existing);
    await this.ensureIntents(existing);
    await this.ensureProducts(existing);
  }

  private async ensure(name: string, existing: Set<string>) {
    if (existing.has(name)) return;

    await this.client.createCollection(name, {
      vectors: { size: this.dimension, distance: "Cosine" },
    });
  }

  private async ensureIntents(existing: Set<string>) {
    if (existing.has("intents")) return;

    await this.client.createCollection("intents", {
      vectors: { size: this.dimension, distance: "Cosine" },
    });
    await this.client.createPayloadIndex("intents", {
      field_name: "lang" satisfies LangKey,
      field_schema: "keyword",
    });
    await this.client.createPayloadIndex("intents", {
      field_name: "module" satisfies ModuleKey,
      field_schema: "keyword",
    });
    await this.client.createPayloadIndex("intents", {
      field_name: "domain" satisfies DomainKey,
      field_schema: "keyword",
    });
  }

  private async ensureProducts(existing: Set<string>) {
    if (existing.has("products")) return;

    await this.client.createCollection("products", {
      vectors: { size: this.dimension, distance: "Cosine" },
      /**
       * @link https://qdrant.tech/documentation/guides/multitenancy/
       */
      hnsw_config: { payload_m: 16, m: 0 },
    });
    await this.client.createPayloadIndex("products", {
      field_name: "business" satisfies BusinessKey,
      field_schema: {
        type: "uuid",
        is_tenant: true,
      },
    });
    await this.client.createPayloadIndex("products", {
      field_name: "enabled" satisfies EnabledKey,
      field_schema: "bool",
    });
  }

  private async ensureBusinessMedia(existing: Set<string>) {
    if (existing.has("business-media")) return;

    await this.client.createCollection("business-media", {
      vectors: { size: this.dimension, distance: "Cosine" },
      /**
       * @link https://qdrant.tech/documentation/guides/multitenancy/
       */
      hnsw_config: { payload_m: 16, m: 0 },
    });
    await this.client.createPayloadIndex("business-media", {
      field_name: "business" satisfies BusinessKey,
      field_schema: {
        type: "uuid",
        is_tenant: true,
      },
    });
  }

  // ---------------- Products ----------------

  upsertProduct(id: string, vector: number[], payload: Partial<Product>) {
    return this.client.upsert("products", {
      wait: true,
      points: [{ id, vector, payload }],
    });
  }

  upsertBusinessMedia(
    id: string,
    vector: number[],
    payload: Partial<BusinessesMedia>,
  ) {
    return this.client.upsert("business-media", {
      wait: true,
      points: [{ id, vector, payload }],
    });
  }

  deleteProduct(id: string) {
    return this.client.delete("products", {
      wait: true,
      points: [id],
    });
  }

  deleteBusinessMedia(id: string) {
    return this.client.delete("business-media", {
      wait: true,
      points: [id],
    });
  }

  deleteProductsByBusiness(businessId: string) {
    return this.client.delete("products", {
      filter: {
        must: [
          {
            key: "business" satisfies BusinessKey,
            match: { value: businessId },
          },
        ],
      },
    });
  }

  searchProducts(
    vector: number[],
    businessId: string,
    limit: number,
    threshold: number,
  ): Promise<Schemas["QueryResponse"]> {
    return this.client.query("products", {
      query: vector,
      with_payload: true,
      score_threshold: threshold,
      filter: {
        must: [
          {
            key: "business" satisfies BusinessKey,
            match: { value: businessId },
          },
          // { key: "enabled" satisfies EnabledKey, match: { value: true } },
        ],
      },
      limit,
    });
  }

  searchBusinessMedia(
    vector: number[],
    businessId: string,
    limit: number,
    threshold: number,
  ): Promise<Schemas["QueryResponse"]> {
    return this.client.query("business-media", {
      query: vector,
      with_payload: true,
      score_threshold: threshold,
      filter: {
        must: [
          {
            key: "business" satisfies BusinessKey,
            match: { value: businessId },
          },
        ],
      },
      limit,
    });
  }

  // ---------------- Intents ----------------

  upsertIntents(
    points: {
      id: string;
      vector: number[] | number[][];
      payload: IntentPayload;
    }[],
  ) {
    return this.client.upsert("intents", {
      wait: true,
      points,
    });
  }

  queryIntents(
    vector: number[],
    activeModules: ModuleKind[],
    lang: string,
    specializedDomain: SpecializedDomain,
    limit: number,
    threshold: number,
  ) {
    return this.client.query("intents", {
      query: vector,
      score_threshold: threshold,
      with_payload: true,
      filter: {
        must: [
          { key: "lang" satisfies LangKey, match: { value: lang } },
          {
            // OR: busca modules activos por domain
            // min_should: 1,
            should: activeModules.map((d) => ({
              key: "module" satisfies ModuleKey,
              match: { value: d },
            })),
          },
          {
            // OR: busca intents del dominio específico O del dominio general (transversal)
            should: [
              {
                key: "domain" satisfies DomainKey,
                match: { value: specializedDomain },
              },
              {
                key: "domain" satisfies DomainKey,
                match: { value: GENERAL_DOMAIN },
              },
            ],
            // min_should: 1,
          },
        ],
      },
      limit,
    }) as Promise<{ points: QuadrantPoint<IntentPayload>[] }>;
  }

  deleteIntents() {
    return this.client.deleteCollection("intents");
  }

  async deleteCollections() {
    const { collections = [] } = await this.client.getCollections();
    await Promise.all(
      collections.map((collection) =>
        this.client.deleteCollection(collection.name),
      ),
    );
  }
}
