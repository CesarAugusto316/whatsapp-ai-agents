import { aiAdapter, IAiAdapter } from "@/infraestructure/adapters/ai";
import { cacheAdapter, ICacheAdapter } from "@/infraestructure/adapters/cache";
import {
  IntentPayload,
  IVectorStoreAdapter,
  QuadrantPoint,
  VectorStoreAdapter,
} from "@/infraestructure/adapters/vector-store";
import { Schemas } from "@qdrant/js-client-rest";
import {
  BusinessesMedia,
  Product,
  SpecializedDomain,
} from "@/infraestructure/adapters/cms";
import { ModuleKind } from "@/application/services/pomdp";
import { IntentExample, IntentExampleKey, intentExamples } from "../pomdp";

/**
 *
 * Servicio de aplicación para operaciones semánticas
 * Coordina embeddings, caché y búsqueda vectorial
 */
class RagService {
  private readonly EMBED_VERSION = "qwen3-0.6b";
  private readonly THRESHOLD = 0.6;
  private readonly CACHE_TTL = 60 * 60 * 24 * 40; // 40 días

  constructor(
    private vectorAdapter: IVectorStoreAdapter,
    private aiAdapter: IAiAdapter,
    private cacheAdapter: ICacheAdapter,
  ) {}

  // -------------------- MÉTODOS PRIVADOS DE UTILIDAD --------------------

  private sha256(input: string, encoding: "hex" | "base64" = "hex") {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(input);
    return hasher.digest(encoding);
  }

  private hashToUUID(hash: string): string {
    if (hash.length < 32) {
      throw new Error("Hash demasiado corto para generar UUID");
    }
    // Tomamos 128 bits (32 hex chars)
    const hex = hash.slice(0, 32).toLowerCase();
    // Convertimos a array mutable
    const chars = hex.split("");
    // Forzamos versión UUID = 4 (posición 12)
    chars[12] = "4";
    // Forzamos variant RFC 4122 (posición 16: 8,9,a,b)
    const variant = parseInt(chars[16], 16);
    chars[16] = ((variant & 0x3) | 0x8).toString(16);
    const uuid = chars.join("");

    return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
  }

  private normalizeText(text?: string): string {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  /**
   *
   * @description user query vectors are store in redis only not in qdrant
   * @param text
   * @param cacheKey
   * @returns
   */
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
    await this.cacheAdapter.save(cacheKey, embedding, this.CACHE_TTL); // Store in disk

    return embedding;
  }

  // -------------------- INTENCIONES SEMÁNTICAS --------------------
  /**
   *
   * @todo Futuro (si necesitas más precisión):
   * 1. Hybrid search (vector + keywords):
   * Combinar similitud semántica + match exacto de palabras clave
   * score = 0.7 * vectorScore + 0.3 * keywordScore
   *
   * @description Busca una consulta en todo el universo semántico del negocio
   * y devuelve un payload con su intent, el intent clasifica/distingue
   * la intención de la consulta
   * @example
   *  Para un restaurante con booking habilitado
   *  const restaurantWithBooking = await searchIntent(
   *  "¿Puedo reservar una mesael viernes?",
   *  "1.0",
   *  ["restaurant", "informational", "booking"], // Modules activos
   *  3,
   *  "es"
   * );
   */
  async searchIntent(
    query: string,
    activeModules: ModuleKind[],
    domain: SpecializedDomain,
    limit = 3,
    lang = "es",
    version = "1.0",
  ) {
    // VALIDACIONES DE DOMINIO (lógica de aplicación)
    if (!activeModules.includes("informational")) {
      throw new Error('El module "informational" siempre debe estar activo');
    }

    if (activeModules.length <= 2) {
      throw new Error("Debe haber al menos 2 dominios activos");
    }

    // 1. Generar clave de caché para el embedding
    const modulesKey = activeModules.sort().join(",");
    const normalizedQuery = this.normalizeText(query);
    const hash = this.sha256(
      `${version}:${modulesKey}:${lang}:${this.EMBED_VERSION}:${normalizedQuery}`,
    );

    // 2. Obtener embedding (con caché)
    const embedding = await this.getOrCreateEmbedding(normalizedQuery, hash);

    // 3. Buscar en vector DB (delegando al adaptador puro)
    return this.vectorAdapter.queryIntents(
      embedding,
      activeModules,
      lang,
      domain,
      limit,
      this.THRESHOLD,
    ) as Promise<{ points: QuadrantPoint<IntentPayload>[] }>;
  }

  /**
   * Inserta o actualiza intenciones en el sistema
   */
  async upsertIntents(intents: readonly IntentExample<IntentExampleKey>[]) {
    // 1. Preparar datos para embedding en lote
    const prepared = intents.flatMap(
      ({ intentKey, module, examples, lang, requiresConfirmation, domain }) =>
        examples.map(
          (ex) =>
            ({
              text: this.normalizeText(ex),
              intentKey,
              module,
              domain,
              requiresConfirmation,
              lang,
            }) satisfies IntentPayload,
        ),
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
      const { intentKey, module, lang, text, requiresConfirmation, domain } =
        prepared[i];
      const hash = this.sha256(`${domain}:${module}:${lang}:${text}`);
      return {
        id: this.hashToUUID(hash), // Generar ID determinístico
        vector: embedding,
        payload: {
          text,
          module,
          domain,
          requiresConfirmation,
          lang,
          intentKey,
        } satisfies IntentPayload,
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
  ) {
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
    ) as Promise<{ points: QuadrantPoint<Partial<Product>>[] }>;
  }

  /**
   * Busca productos semánticamente similares
   */
  async searchBusinessMedia(
    query: string,
    businessId: string,
    limit = 3,
    lang = "es",
  ) {
    // 1. Generar clave de caché
    const normalizedQuery = this.normalizeText(query);
    const hash = this.sha256(
      `${lang}:${this.EMBED_VERSION}:${normalizedQuery}`,
    );

    // 2. Obtener embedding (con caché)
    const embedding = await this.getOrCreateEmbedding(normalizedQuery, hash);

    // 3. Buscar en vector DB
    return this.vectorAdapter.searchBusinessMedia(
      embedding,
      businessId,
      limit,
      this.THRESHOLD,
    ) as Promise<{ points: QuadrantPoint<Partial<BusinessesMedia>>[] }>;
  }

  /**
   *
   * @requires refactor
   * @todo we use only name and description for embeding,
   * if other fields changed, then just update the payload not the vector itself
   *
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
      estimatedProcessingTime: product.estimatedProcessingTime,
    } satisfies Partial<Product>;

    // 4. Insertar en vector DB
    return this.vectorAdapter.upsertProduct(
      product.id,
      data[0].embedding,
      payload,
    );
  }

  async upsertBusinessMedia(media: BusinessesMedia) {
    // 2. Generar embedding
    const data = await this.aiAdapter.embedding({
      input: this.normalizeText(media.alt),
      dimensions: this.vectorAdapter.dimension,
    });

    // 3. Preparar payload
    const payload = {
      alt: media.alt,
      url: media.url,
      thumbnailURL: media.thumbnailURL,
      business:
        typeof media.business === "string" ? media.business : media.business.id,
    } satisfies Partial<BusinessesMedia>;

    // 4. Insertar en vector DB
    return this.vectorAdapter.upsertBusinessMedia(
      media.id,
      data[0].embedding,
      payload,
    );
  }

  // -------------------- OPERACIONES DE ADMINISTRACIÓN --------------------

  async deleteProductById(id: string) {
    return this.vectorAdapter.deleteProduct(id);
  }

  async deleteMediaById(id: string) {
    return this.vectorAdapter.deleteBusinessMedia(id);
  }

  async deleteAllProducts(businessId: string) {
    return this.vectorAdapter.deleteProductsByBusiness(businessId);
  }

  /**
   *
   * @fires from the comand-line
   * @description seeds the vector DB
   */
  async seedIntents() {
    try {
      await this.init();
    } catch (error) {
      console.error("Error seeding intents:", error);
    }
    return this.upsertIntents(intentExamples);
  }

  /**
   *
   * @fires from the comand-line
   * @description deletes all collections in the vector DB
   */
  async deleteCollections() {
    await this.init();
    await this.vectorAdapter.deleteCollections();
  }

  /**
   * Inicializa las colecciones vectoriales (solo una vez)
   */
  async init(): Promise<void> {
    await this.vectorAdapter.ensureCollections();
  }
}

export const ragService = new RagService(
  new VectorStoreAdapter(),
  aiAdapter,
  cacheAdapter,
);
