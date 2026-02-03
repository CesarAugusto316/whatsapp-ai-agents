import { QdrantClient, Schemas } from "@qdrant/js-client-rest";
import { Product } from "../http/cms/cms-types";
import { aiClient } from "../http/ai";
import { redisClient } from "../cache/redis.client";
import { SemanticIntent } from "@/domain/semantic/booking";

/**
 *
 * @link https://qdrant.tech/documentation/quickstart/
 * @link dashboard: env.QDRANT_URL/dashboard = http://localhost:6333/dashboard
 */
class RagService {
  private EMBED_VERSION = "qwen3-0.6b";
  private DIMENSION = 1024;
  private vectorDB = new QdrantClient({ url: Bun.env.QDRANT_URL });
  static initialized = false;

  constructor() {
    if (RagService.initialized) return;
    RagService.initialized = true;
    this.init().catch(console.error);
  }

  private sha256(input: string, encoding: "hex" | "base64" = "hex") {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(input);
    return hasher.digest(encoding);
  }

  private sha256ToUUID(input: string) {
    const hash = this.sha256(input, "hex"); // 64 chars
    // Tomamos los primeros 32 chars para formar UUID
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
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
          size: this.DIMENSION, // qwen3-embedding
          distance: "Cosine",
        },
      });
    }

    if (!existing.has("intents")) {
      await this.vectorDB.createCollection("intents", {
        vectors: {
          size: this.DIMENSION, // qwen3-embedding
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
          size: this.DIMENSION,
          distance: "Cosine",
        },
        /**
         * @link https://qdrant.tech/documentation/guides/multitenancy/
         */
        hnsw_config: {
          payload_m: 16,
          m: 0,
        },
      });

      /**
       *
       * @description products from diferent businesses MUST BE excluded from the search results
       * products from business A must not appeared in business B
       */
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
    const input = [product.name, product.description]
      .map(this.normalizeText)
      .filter(Boolean)
      .join(". ");

    const data = await aiClient.embedding({
      input,
    });

    return this.vectorDB.upsert("products", {
      wait: true,
      points: [
        {
          id: product.id,
          vector: data[0].embedding,
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

  async deleteProductById(productId: string) {
    return this.vectorDB.delete("products", {
      wait: true,
      points: [productId],
    });
  }

  async deleteAllProducts(businessId: string) {
    return await this.vectorDB.delete("products", {
      filter: {
        must: [{ key: "business", match: { value: businessId } }],
      },
    });
  }

  /**
   *
   * @param query tiene camisas blancas manga larga?
   * @param businessId
   * @param limit
   * @returns
   */
  async searchProducts(
    query: string,
    businessId: string,
    limit = 3,
    lang = "es",
  ): Promise<Schemas["QueryResponse"]> {
    //
    const normalized = this.normalizeText(query);
    const hash = this.sha256(`${lang}:${this.EMBED_VERSION}:${normalized}`);
    const cachedEmbedding = await redisClient.get(hash);

    // we cache semantic intention, result is strcitly separated by businessId
    if (cachedEmbedding) {
      return this.vectorDB.query("products", {
        query: JSON.parse(cachedEmbedding) satisfies number[],
        filter: {
          must: [
            { key: "business", match: { value: businessId } },
            { key: "enabled", match: { value: true } },
          ],
        },
        limit,
      });
    }

    const data = await aiClient.embedding({
      input: this.normalizeText(query),
    });

    await redisClient.set(hash, JSON.stringify(data[0].embedding));
    await redisClient.expire(hash, 60 * 60 * 24 * 40); // 40 days

    return this.vectorDB.query("products", {
      query: data[0].embedding,
      filter: {
        must: [
          { key: "business", match: { value: businessId } },
          { key: "enabled", match: { value: true } },
        ],
      },
      limit,
    });
  }

  async classifyIntent(
    query: string,
    businessDomain: string,
    ontologyVersion: "1.0",
    limit = 3,
    lang = "es",
  ): Promise<Schemas["QueryResponse"]> {
    //
    const normalized = this.normalizeText(query);
    const hash = this.sha256(
      `${ontologyVersion}:${businessDomain}:${lang}:${this.EMBED_VERSION}:${normalized}`,
    );
    const cachedEmbedding = await redisClient.get(hash);

    // we cache semantic intention, result is strcitly separated by businessId
    if (cachedEmbedding) {
      return this.vectorDB.query("intents", {
        query: JSON.parse(cachedEmbedding) satisfies number[],
        filter: {
          must: [{ key: "businessDomain", match: { value: businessDomain } }],
        },
        limit,
      });
    }

    const data = await aiClient.embedding({
      input: this.normalizeText(query),
    });

    await redisClient.set(hash, JSON.stringify(data[0].embedding));
    await redisClient.expire(hash, 60 * 60 * 24 * 40); // 40 days

    return this.vectorDB.query("intents", {
      query: data[0].embedding,
      filter: {
        must: [{ key: "businessDomain", match: { value: businessDomain } }],
      },
      limit,
    });
  }

  async upsertIntents(intents: SemanticIntent[]) {
    const prepared = intents
      .map((intent) => ({
        intent,
        text: intent.examples
          .map(this.normalizeText)
          .filter(Boolean)
          .join(". "),
      }))
      .filter((i) => i.text.length);

    if (!prepared.length) throw new Error("No valid intents provided");

    const embeddings = (
      (await aiClient.embedding({
        input: prepared.map((p) => p.text),
        dimensions: this.DIMENSION,
      })) || []
    )?.filter(({ embedding }) => embedding.length === this.DIMENSION);

    const points = embeddings.map(({ embedding }, i) => {
      const { intent, domain, language } = prepared[i].intent;
      return {
        id: this.sha256ToUUID(`${domain}:${language}:${intent}`),
        vector: embedding,
        payload: {
          domain,
          language,
          intent,
        },
      };
    });

    return this.vectorDB.upsert("intents", {
      wait: true,
      points,
    });
  }
}

export const ragService = new RagService();
