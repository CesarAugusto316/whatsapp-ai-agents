import { QdrantClient } from "@qdrant/js-client-rest";
import { Product } from "../http/cms/cms-types";
import { aiClient } from "../http/ai";

/**
 *
 * @link https://qdrant.tech/documentation/quickstart/
 */
class RagService {
  vectorDB = new QdrantClient({ host: "localhost", port: 6333 });

  constructor() {
    this.init().catch(console.error);
  }

  private normalizeText(text?: string) {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  private async init() {
    const collections = await this.vectorDB.getCollections();
    const existing = new Set(collections.collections.map((c) => c.name));

    if (!existing.has("businesses")) {
      await this.vectorDB.createCollection("businesses", {
        vectors: {
          size: 1024, // qwen3-embedding
          distance: "Cosine",
        },
      });
    }

    if (!existing.has("products")) {
      await this.vectorDB.createCollection("products", {
        vectors: {
          /**
           * @link https://ollama.com/library/qwen3-embedding:0.6b
           */
          size: 1024,
          distance: "Cosine",
        },
        hnsw_config: {
          payload_m: 16,
          m: 0,
        },
      });

      await this.vectorDB.createPayloadIndex("products", {
        field_name: "business",
        field_schema: {
          type: "keyword",
          /**
           * @link https://qdrant.tech/documentation/guides/multitenancy/
           */
          is_tenant: true,
        },
      });
    }
  }

  async upsertProduct(product: Product) {
    const text = [product.name, product.description]
      .map(this.normalizeText)
      .filter(Boolean)
      .join(". ");

    const embedding = await aiClient.embedding({
      text,
    });

    console.log({ embedding });
    return this.vectorDB.upsert("products", {
      wait: true,
      points: [
        {
          id: product.id,
          vector: embedding[0],
          payload: {
            name: product.name,
            description: product.description,
            business:
              typeof product.business === "string"
                ? product.business
                : product.business.id,
            enabled: product.enabled,
            price: product.price,
            type: product.type,
          } as Partial<Product>,
        },
      ],
    });
  }

  /**
   *
   * @param query tiene camisas blancas manga larga?
   * @param businessId
   * @param limit
   * @returns
   */
  async searchProducts(query: string, businessId: string, limit = 3) {
    const embedding = await aiClient.embedding({
      text: this.normalizeText(query),
    });
    return this.vectorDB.query("products", {
      query: embedding[0],
      filter: {
        must: [
          { key: "business", match: { value: businessId } },
          { key: "enabled", match: { value: true } },
        ],
      },
      limit,
    });
  }
}

export const ragService = new RagService();
