import { QdrantClient, Schemas } from "@qdrant/js-client-rest";
import { Product } from "../http/cms/cms-types";
import { aiClient } from "../http/ai";
import { redisClient } from "../cache/redis.client";
import { GlobalSemanticIntent } from "@/domain/semantic/universal-intents";
import {
  SpecializedSemanticIntent,
  SpecializedDomain,
} from "@/domain/semantic/specialized-intents";

/**
 *
 * @link https://qdrant.tech/documentation/quickstart/
 * @link dashboard: env.QDRANT_URL/dashboard = http://localhost:6333/dashboard
 */
class RagService {
  private readonly EMBED_VERSION = "qwen3-0.6b";
  private readonly THRESHOLD = 0.7;
  private readonly business = "business";
  private readonly intents = "intents";
  private readonly products = "products";
  private readonly DIMENSION = 1024;
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

    if (!existing.has(this.business)) {
      await this.vectorDB.createCollection(this.business, {
        vectors: {
          size: this.DIMENSION, // qwen3-embedding
          distance: "Cosine",
        },
      });
    }

    if (!existing.has("intents")) {
      await this.vectorDB.createCollection(this.intents, {
        vectors: {
          size: this.DIMENSION, // qwen3-embedding
          distance: "Cosine",
        },
      });
    }

    if (!existing.has(this.products)) {
      await this.vectorDB.createCollection(this.products, {
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
      await this.vectorDB.createPayloadIndex(this.products, {
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

    return this.vectorDB.upsert(this.products, {
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
    return this.vectorDB.delete(this.products, {
      wait: true,
      points: [productId],
    });
  }

  async deleteAllProducts(businessId: string) {
    return await this.vectorDB.delete(this.products, {
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
      return this.vectorDB.query(this.products, {
        query: JSON.parse(cachedEmbedding) satisfies number[],
        score_threshold: this.THRESHOLD,
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

    return this.vectorDB.query(this.products, {
      query: data[0].embedding,
      score_threshold: this.THRESHOLD,
      filter: {
        must: [
          { key: "business", match: { value: businessId } },
          { key: "enabled", match: { value: true } },
        ],
      },
      limit,
    });
  }

  /**
   *
   * @param intents
   * @returns
   */
  async upsertIntents(
    intents: GlobalSemanticIntent[] | SpecializedSemanticIntent[],
  ) {
    const prepared = intents.flatMap(({ intent, domain, examples, lang }) =>
      examples.map((ex) => ({
        text: this.normalizeText(ex),
        intent,
        domain,
        lang,
      })),
    );

    if (!prepared.length) throw new Error("No valid intents provided");

    const embeddings = (
      (await aiClient.embedding({
        input: prepared.map((p) => p.text),
        dimensions: this.DIMENSION,
      })) || []
    )?.filter(({ embedding }) => embedding.length === this.DIMENSION);

    const points = embeddings.map(({ embedding }, i) => {
      const { intent, domain, lang } = prepared[i];
      return {
        id: this.sha256ToUUID(`${domain}:${lang}:${intent}`),
        vector: embedding,
        payload: {
          domain,
          lang,
          intent,
        },
      };
    });

    return this.vectorDB.upsert(this.intents, {
      wait: true,
      points,
    });
  }

  // Primero, extraemos la lógica común de embedding a un método privado
  private async getEmbedding(
    query: string,
    ontologyVersion: string,
    domain?: SpecializedDomain,
    lang: string = "es",
  ): Promise<number[]> {
    const normalized = this.normalizeText(query);
    const hash = this.sha256(
      `${ontologyVersion}:${domain ? `${domain}:` : ""}${lang}:${this.EMBED_VERSION}:${normalized}`,
    );

    const cachedEmbedding = await redisClient.get(hash);
    if (cachedEmbedding) {
      return JSON.parse(cachedEmbedding) satisfies number[];
    }

    const data = await aiClient.embedding({
      input: normalized,
    });

    const embedding = data[0].embedding;
    await redisClient.set(hash, JSON.stringify(embedding));
    await redisClient.expire(hash, 60 * 60 * 24 * 40); // 40 días

    return embedding;
  }

  // Función para intenciones globales (sin dominio específico)
  async classifyGlobalIntent(
    query: string,
    ontologyVersion: "1.0",
    limit = 3,
    lang = "es",
  ): Promise<Schemas["QueryResponse"]> {
    const embedding = await this.getEmbedding(
      query,
      ontologyVersion,
      undefined, // No domain
      lang,
    );

    return this.vectorDB.query(this.intents, {
      query: embedding,
      score_threshold: this.THRESHOLD,
      filter: {
        must: [{ key: "lang", match: { value: lang } }],
        must_not: [
          { key: "domain", exists: true }, // Excluye cualquier documento con dominio
        ],
      },
      limit,
    });
  }

  // Función para intenciones especializadas (con dominio específico)
  async classifySpecializedIntent(
    query: string,
    ontologyVersion: "1.0",
    domain: SpecializedDomain, // Obligatorio para intenciones especializadas
    limit = 3,
    lang = "es",
  ): Promise<Schemas["QueryResponse"]> {
    const embedding = await this.getEmbedding(
      query,
      ontologyVersion,
      domain, // Domain especializado
      lang,
    );

    return this.vectorDB.query(this.intents, {
      query: embedding,
      score_threshold: this.THRESHOLD,
      filter: {
        must: [
          { key: "lang", match: { value: lang } },
          { key: "domain", match: { value: domain } }, // Filtro estricto por dominio
        ],
      },
      limit,
    });
  }
}

export const ragService = new RagService();
