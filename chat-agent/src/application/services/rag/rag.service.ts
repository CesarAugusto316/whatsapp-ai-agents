// application/services/semantic.service.ts
import { aiAdapter, IAiAdapter } from "@/infraestructure/adapters/ai";
import { cacheAdapter, ICacheAdapter } from "@/infraestructure/adapters/cache";
import {
  IVectorAdapter,
  VectorAdapter,
} from "@/infraestructure/adapters/vector";
import { Schemas } from "@qdrant/js-client-rest";
import { SemanticIntent } from "./rag.types";
import { Product } from "@/infraestructure/adapters/cms";

/**
 * Servicio de aplicación para operaciones semánticas
 * Coordina embeddings, caché y búsqueda vectorial
 */
class RagService {
  private readonly EMBED_VERSION = "qwen3-0.6b";
  private readonly THRESHOLD = 0.7;
  private readonly CACHE_TTL = 60 * 60 * 24 * 40; // 40 días

  constructor(
    private vectorAdapter: IVectorAdapter,
    private aiAdapter: IAiAdapter,
    private cacheAdapter: ICacheAdapter,
  ) {}

  // -------------------- MÉTODOS PRIVADOS DE UTILIDAD --------------------

  private sha256(input: string, encoding: "hex" | "base64" = "hex") {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(input);
    return hasher.digest(encoding);
  }

  private normalizeText(text?: string): string {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  private async getOrCreateEmbedding(
    text: string,
    cacheKey: string,
  ): Promise<number[]> {
    // 1. Verificar caché
    const cached = await this.cacheAdapter.getObj<number[]>(cacheKey);
    if (cached) return cached;

    // 2. Generar nuevo embedding
    const data = await this.aiAdapter.embedding({
      input: this.normalizeText(text),
      dimensions: this.vectorAdapter.dimension, // 1024
    });

    const embedding = data[0].embedding;

    // 3. Guardar en caché
    await this.cacheAdapter.save(cacheKey, embedding, this.CACHE_TTL);

    return embedding;
  }

  // -------------------- INTENCIONES SEMÁNTICAS --------------------
  /**
   *
   * @description Clasifica una consulta en todo el universo semántico del negocio
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
   */
  async classifyIntent(
    query: string,
    version: "1.0",
    activeDomains: string[],
    limit = 3,
    lang = "es",
  ): Promise<Schemas["QueryResponse"]> {
    // VALIDACIONES DE DOMINIO (lógica de aplicación)
    if (!activeDomains.includes("global")) {
      throw new Error('El dominio "global" siempre debe estar activo');
    }

    if (activeDomains.length <= 2) {
      throw new Error("Debe haber al menos 2 dominios activos");
    }

    // 1. Generar clave de caché para el embedding
    const domainsKey = activeDomains.sort().join(",");
    const normalizedQuery = this.normalizeText(query);
    const hash = this.sha256(
      `${version}:${domainsKey}:${lang}:${this.EMBED_VERSION}:${normalizedQuery}`,
    );

    // 2. Obtener embedding (con caché)
    const embedding = await this.getOrCreateEmbedding(normalizedQuery, hash);

    // 3. Buscar en vector DB (delegando al adaptador puro)
    return this.vectorAdapter.queryIntents(
      embedding,
      activeDomains,
      lang,
      limit,
      this.THRESHOLD,
    );
  }

  /**
   * Inserta o actualiza intenciones en el sistema
   */
  async upsertIntents<I extends string, D extends string>(
    intents: SemanticIntent<I, D>[],
  ) {
    // 1. Preparar datos para embedding en lote
    const prepared = intents.flatMap(({ intent, domain, examples, lang }) =>
      examples.map((ex) => ({
        text: this.normalizeText(ex),
        intent,
        domain,
        lang,
      })),
    );

    if (!prepared.length) {
      throw new Error("No se proporcionaron intenciones válidas");
    }

    // 2. Generar embeddings en lote
    const embeddings = await this.aiAdapter.embedding({
      input: prepared.map((p) => p.text),
      dimensions: this.vectorAdapter.dimension, // 1024
    });

    // 3. Preparar puntos para Qdrant
    const points = embeddings.map(({ embedding }, i) => {
      const { intent, domain, lang, text } = prepared[i];
      // Generar ID determinístico
      const hash = this.sha256(`${domain}:${lang}:${text}`);
      const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
      return {
        id,
        vector: embedding,
        payload: {
          text,
          domain,
          lang,
          intent,
        },
      };
    });

    // 4. Insertar en vector DB
    return this.vectorAdapter.upsertIntents(points);
  }

  // -------------------- BÚSQUEDA DE PRODUCTOS --------------------

  /**
   * Busca productos semánticamente similares
   */
  async searchProducts(
    query: string,
    businessId: string,
    limit = 3,
    lang = "es",
  ): Promise<Schemas["QueryResponse"]> {
    // 1. Generar clave de caché
    const normalizedQuery = this.normalizeText(query);
    const hash = this.sha256(
      `${lang}:${this.EMBED_VERSION}:${normalizedQuery}`,
    );

    // 2. Obtener embedding (con caché)
    const embedding = await this.getOrCreateEmbedding(normalizedQuery, hash);

    // 3. Buscar en vector DB
    return this.vectorAdapter.searchProducts(
      embedding,
      businessId,
      limit,
      this.THRESHOLD,
    );
  }

  /**
   * Inserta o actualiza un producto con embedding semántico
   */
  async upsertProduct(product: Product) {
    // 1. Preparar texto para embedding
    const input = [product.name, product.description]
      .map(this.normalizeText)
      .filter(Boolean)
      .join(". ");

    // 2. Generar embedding
    const data = await this.aiAdapter.embedding({
      input,
      dimensions: this.vectorAdapter.dimension,
    });

    // 3. Preparar payload
    const payload = {
      name: product.name,
      description: product.description,
      business:
        typeof product.business === "string"
          ? product.business
          : product.business.id,
      enabled: product.enabled,
      price: product.price,
      type: product.type,
    } as Partial<Product>;

    // 4. Insertar en vector DB
    return this.vectorAdapter.upsertProduct(
      product.id,
      data[0].embedding,
      payload,
    );
  }

  // -------------------- OPERACIONES DE ADMINISTRACIÓN --------------------

  async deleteProductById(productId: string) {
    return this.vectorAdapter.deleteProduct(productId);
  }

  async deleteAllProducts(businessId: string) {
    return this.vectorAdapter.deleteProductsByBusiness(businessId);
  }

  /**
   * Inicializa las colecciones vectoriales (solo una vez)
   */
  async init(): Promise<void> {
    await this.vectorAdapter.ensureCollections();
  }
}

export const ragService = new RagService(
  new VectorAdapter(),
  aiAdapter,
  cacheAdapter,
);
