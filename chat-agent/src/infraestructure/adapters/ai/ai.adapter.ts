import { env, fetch } from "bun";
import { ChatCompletionResponse, MessagesBasedRequest } from "./index";
import {
  CircuitBreaker,
  resilientQuery,
  ResilientQueryOptions,
} from "@/application/patterns";
import { EmbeddingRequest, EmbeddingResponse } from "./embeddings.types";
import { IAiAdapter } from "./ai.adapter.interface";

// resilient query + circuit breaker
const chatConfig = {
  timeoutMs: 40_000,
  circuitBraker: new CircuitBreaker(
    {
      failureThreshold: 3, // 3 fallos seguidos abren el circuito
      resetTimeout: 40_000, // 30 segundos en OPEN
      halfOpenSuccessThreshold: 2, // 2 éxitos para cerrar
    },
    "ai-chat",
  ),
  retryConfig: {
    backoffRate: 2,
    maxAttempts: 3,
    intervalSeconds: 2,
  },
} satisfies ResilientQueryOptions;

// resilient query + circuit breaker
const embeddingConfig = {
  timeoutMs: 40_000,
  circuitBraker: new CircuitBreaker(
    {
      failureThreshold: 3, // 3 fallos seguidos abren el circuito
      resetTimeout: 40_000, // 30 segundos en OPEN
      halfOpenSuccessThreshold: 2, // 2 éxitos para cerrar
    },
    "ai-embedding",
  ),
  retryConfig: {
    backoffRate: 2,
    maxAttempts: 3,
    intervalSeconds: 2,
  },
} satisfies ResilientQueryOptions;

/**
 *
 * @description ai adapter
 */
class AiAdapter implements IAiAdapter {
  private config = (() => {
    const envName = env.NODE_ENV || "development";

    // ============================================
    // TEST: Local Ollama (100% offline, gratis)
    // ============================================
    if (envName === "test") {
      return {
        url: "http://localhost:11434/v1",
        primaryModel: "granite4:micro-h",
        auxModel: "granite4:micro-h",
        embedding: "qwen3-embedding-0.6b",
        headers: {
          Authorization: "",
          "Content-Type": "application/json",
        },
        provider: "ollama" as const,
      };
    }

    // ============================================
    // DEVELOPMENT: Cloudflare AI (gratis tier, rápido)
    // ============================================
    if (envName === "development") {
      return {
        url: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
        primaryModel: "@cf/qwen/qwen3-30b-a3b-fp8",
        auxModel: "@cf/ibm-granite/granite-4.0-h-micro",
        embedding: "@cf/qwen/qwen3-embedding-0.6b",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
        provider: "cloudflare" as const,
      };
    }

    // ============================================
    // PRODUCTION: DeepInfra or OpenRouter (mejor calidad/precio ratio)
    // ============================================
    if (envName === "production") {
      return {
        url: "https://openrouter.ai/api/v1",
        /**
         *
         * @link https://openrouter.ai/qwen/qwen3-235b-a22b-2507
         * 💰
         * $0.071 / M tokens input
         * $0.10 / M tokens output
         * ✅ Mejor que el qwen3 30b para RAG + POMDP (mayor contexto, mejor razonamiento)
         */
        primaryModel: "qwen/qwen3-235b-a22b-2507",
        /**
         *
         * LiquidAI: LFM2-8B-A1B  (para tareas auxiliares)
         * @link https://openrouter.ai/liquid/lfm2-8b-a1b
         * Created Oct 20, 2025
         * 32,768 context
         * $0.01/M input tokens
         * $0.02/M output tokens
         *
         * alternative: same price
         * - qwen/qwen3-30b-a3b  https://openrouter.ai/qwen/qwen3-30b-a3b ( $0.06/M input tokens, $0.22/M output tokens)
         * - qwen/qwen3-14b      https://openrouter.ai/qwen/qwen3-14b  ( $0.05/M input tokens, $0.22/M output tokens)
         */
        auxModel: "liquid/lfm2-8b-a1b",
        /**
         * Embeddings de alta calidad para tu RAG
         * @link https://openrouter.ai/qwen/qwen3-embedding-8b
         * 💰 $0.01 / M tokens input | $0.00 / M tokens output
         */
        embedding: "qwen/qwen3-embedding-8b",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        provider: "openrouter" as const,
      };
    }

    // ============================================
    // DEFAULT: fallback a development
    // ============================================
    return {
      url: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
      primaryModel: "@cf/qwen/qwen3-30b-a3b-fp8", // 30b
      auxModel: "@cf/ibm-granite/granite-4.0-h-micro", // 3b
      embedding: "@cf/qwen/qwen3-embedding-0.6b", // 0.6b
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      provider: "cloudflare" as const,
    };
  })();

  async generateText({
    messages,
    /**
     * must be set to 0 in some cases
     * @link https://www.ibm.com/granite/docs/models/granite
     */
    temperature = 0.5,
    response_format,
    max_tokens = 512,
    enable_thinking = false,
    useAuxModel = false,
  }: MessagesBasedRequest): Promise<string> {
    //
    return resilientQuery(async () => {
      const response = await fetch(`${this.config.url}/chat/completions`, {
        method: "POST",
        headers: this.config.headers,
        body: JSON.stringify({
          model: useAuxModel ? this.config.auxModel : this.config.primaryModel,
          messages,
          temperature,
          max_tokens,
          response_format,
          enable_thinking,
        }),
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const result = (await response.json()) as ChatCompletionResponse;
      const content = result.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No se recibió respuesta de la AI");
      }
      return content;
    }, chatConfig);
  }

  /**
   * @link https://platform.openai.com/docs/api-reference/embeddings
   * @param payload
   * @returns
   */
  async embedding(payload: EmbeddingRequest) {
    return resilientQuery(async () => {
      const response = await fetch(`${this.config.url}/embeddings`, {
        method: "POST",
        headers: this.config.headers,
        body: JSON.stringify({
          model: payload.model || this.config.embedding,
          ...payload,
        }),
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const result = (await response.json()) as EmbeddingResponse;

      if (!result.data?.length) {
        throw new Error("No embeddings returned");
      }
      return result.data;
    }, embeddingConfig);
  }
}

export default new AiAdapter();
