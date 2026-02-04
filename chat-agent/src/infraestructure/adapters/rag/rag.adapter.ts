import { QdrantClient, Schemas } from "@qdrant/js-client-rest";
import { Product } from "../cms";
import { SemanticIntent } from "./rag.types";
import { IAiAdapter, aiAdapter } from "../ai";
import { cacheAdapter, ICacheAdapter } from "../cache";

/**
 *
 * @link https://qdrant.tech/documentation/quickstart/
 * @link dashboard: env.QDRANT_URL/dashboard = http://localhost:6333/dashboard
 */
class RagAdapter {
  private readonly EMBED_VERSION = "qwen3-0.6b";
  private readonly THRESHOLD = 0.7;
  private readonly DIMENSION = 1024;
  private readonly CACHE_TTL = 60 * 60 * 24 * 40; // 40 days
  private readonly business = "business";
  private readonly intents = "intents";
  private readonly products = "products";
  private vectorDB = new QdrantClient({ url: Bun.env.QDRANT_URL });
  static initialized = false;

  constructor(
    private ai: IAiAdapter,
    private cache: ICacheAdapter,
  ) {
    if (RagAdapter.initialized) return;
    RagAdapter.initialized = true;
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

    if (!existing.has(this.intents)) {
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

    const data = await this.ai.embedding({
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
    const cachedEmbedding = await this.cache.getObj<number[]>(hash);

    // we cache semantic intention, result is strcitly separated by businessId
    if (cachedEmbedding) {
      return this.vectorDB.query(this.products, {
        query: cachedEmbedding,
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
    const data = await this.ai.embedding({
      input: this.normalizeText(query),
    });
    await this.cache.save(hash, data[0].embedding, this.CACHE_TTL);

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
  async upsertIntents<I extends string, D extends string>(
    intents: SemanticIntent<I, D>[],
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
      (await this.ai.embedding({
        input: prepared.map((p) => p.text),
        dimensions: this.DIMENSION,
      })) || []
    )?.filter(({ embedding }) => embedding.length === this.DIMENSION);

    const points = embeddings.map(({ embedding }, i) => {
      const { intent, domain, lang, text } = prepared[i];
      return {
        id: this.sha256ToUUID(`${domain}:${lang}:${text}`),
        vector: embedding,
        payload: {
          text,
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

  private async getEmbedding(
    query: string,
    ontologyVersion: string,
    domains: string[], // Ahora recibe array de dominios
    lang: string = "es",
  ): Promise<number[]> {
    const normalized = this.normalizeText(query);

    // Ordenamos los dominios para que el hash sea consistente (mismos dominios en diferente orden = mismo hash)
    const domainsKey = domains.sort().join(",");
    const hash = this.sha256(
      `${ontologyVersion}:${domainsKey}:${lang}:${this.EMBED_VERSION}:${normalized}`,
    );

    const cachedEmbedding = await this.cache.getObj<number[]>(hash);
    if (cachedEmbedding) return cachedEmbedding;

    const data = await this.ai.embedding({
      input: normalized,
    });

    const embedding = data[0].embedding;
    await this.cache.save(hash, embedding, this.CACHE_TTL);
    return embedding;
  }

  /**
   *
   * @description Función principal que clasifica en TODO el universo semántico del negocio
   * @example
   *  Para un restaurante con booking habilitado
   *  const restaurantWithBooking = await classifyIntent(
   *  "¿Puedo reservar una mesa para 4 personas el viernes?",
   *  "1.0",
   *  ["restaurant", "global", "booking"], // Dominios activos
   *  3,
   *  "es"
   * );
   *
   *  Para una farmacia con delivery habilitado
   *  const pharmacyWithDelivery = await classifyIntent(
   *   "¿Pueden entregar este medicamento a domicilio?",
   *   "1.0",
   *   ["pharmacy", "global", "delivery"], // Dominios activos
   *   3,
   *    "es"
   * );
   * @param query
   * @param version
   * @param activeDomains
   * @param limit
   * @param lang
   * @returns
   */
  async classifyIntent(
    query: string,
    version: "1.0",
    activeDomains: string[], // Array con TODOS los dominios activos
    limit = 3,
    lang = "es",
  ): Promise<Schemas["QueryResponse"]> {
    // Validación: siempre debe incluir al menos el dominio especializado y "global"
    if (!activeDomains.includes("global")) {
      throw new Error('El dominio "global" siempre debe estar activo');
    }

    if (activeDomains.length <= 2) {
      throw new Error("Debe haber al menos 2 dominios activos");
    }

    const embedding = await this.getEmbedding(
      query,
      version,
      activeDomains,
      lang,
    );

    // Construimos el filtro que busca en TODOS los dominios activos
    const domainFilters = activeDomains.map((domain) => ({
      key: "domain" as const,
      match: { value: domain } as const,
    }));

    return this.vectorDB.query(this.intents, {
      query: embedding,
      score_threshold: this.THRESHOLD,
      filter: {
        must: [
          { key: "lang", match: { value: lang } },
          {
            // Buscamos en cualquiera de los dominios activos
            should: domainFilters,
          },
        ],
      },
      limit,
    });
  }
}

export const ragAdapter = new RagAdapter(aiAdapter, cacheAdapter);
