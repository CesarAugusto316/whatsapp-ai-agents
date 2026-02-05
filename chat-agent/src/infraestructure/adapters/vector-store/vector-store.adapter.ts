import { QdrantClient, Schemas } from "@qdrant/js-client-rest";
import { Product } from "../cms";
import { IVectorStoreAdapter } from "./vector-store.adapter.interface";

export class VectorStoreAdapter implements IVectorStoreAdapter {
  private client = new QdrantClient({ url: Bun.env.QDRANT_URL });

  constructor(public dimension = 1024) {}

  async ensureCollections() {
    const { collections = [] } = await this.client.getCollections();
    const existing = new Set(collections.map((c) => c.name));

    await this.ensure("business", existing);
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
      field_name: "lang",
      field_schema: "keyword",
    });
    await this.client.createPayloadIndex("intents", {
      field_name: "domain",
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
      field_name: "business",
      field_schema: {
        type: "uuid",
        is_tenant: true,
      },
    });
    await this.client.createPayloadIndex("products", {
      field_name: "enabled",
      field_schema: "bool",
    });
  }

  // ---------------- Products ----------------

  upsertProduct(id: string, vector: number[], payload: Partial<Product>) {
    return this.client.upsert("products", {
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

  deleteProductsByBusiness(businessId: string) {
    return this.client.delete("products", {
      filter: {
        must: [{ key: "business", match: { value: businessId } }],
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
      score_threshold: threshold,
      filter: {
        must: [
          { key: "business", match: { value: businessId } },
          { key: "enabled", match: { value: true } },
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
      payload: Record<string, unknown>;
    }[],
  ) {
    return this.client.upsert("intents", {
      wait: true,
      points,
    });
  }

  queryIntents(
    vector: number[],
    domains: string[],
    lang: string,
    limit: number,
    threshold: number,
  ): Promise<Schemas["QueryResponse"]> {
    return this.client.query("intents", {
      query: vector,
      score_threshold: threshold,
      with_payload: true,
      filter: {
        must: [
          { key: "lang", match: { value: lang } },
          {
            // min_should: 1,
            should: domains.map((d) => ({
              key: "domain",
              match: { value: d },
            })),
          },
        ],
      },
      limit,
    });
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
