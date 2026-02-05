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
  private config =
    env.NODE_ENV === "test"
      ? {
          /**
           *
           * @link https://docs.ollama.com/api/openai-compatibility
           */
          url: "http://localhost:11434/v1",
          model: "granite4:micro-h", // local ollama model
          embedding: "qwen3-embedding-0.6b",
          headers: {
            Authorization: "",
            "Content-Type": "application/json",
          },
        }
      : {
          url: `https://api.cloudflare.com/client/v4/accounts/${env?.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
          model: "@cf/ibm-granite/granite-4.0-h-micro", //"@cf/meta/llama-4-scout-17b-16e-instruct";
          embedding: "@cf/qwen/qwen3-embedding-0.6b",
          headers: {
            Authorization: `Bearer ${env.CLOUDFLARE_AUTH_TOKEN}`,
            "Content-Type": "application/json",
          },
        };

  async userMsg(
    {
      messages,
      /**
       * must be set to 0 in some cases
       * @link https://www.ibm.com/granite/docs/models/granite
       */
      temperature,
      response_format,
      max_tokens = 512,
    }: MessagesBasedRequest,
    prompt: string,
  ): Promise<string> {
    //
    return resilientQuery(async () => {
      const response = await fetch(`${this.config.url}/chat/completions`, {
        method: "POST",
        headers: this.config.headers,
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: "system", content: prompt }, ...messages],
          temperature,
          max_tokens,
          response_format,
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

  async systemMsg(message: string, temperature = 0) {
    return resilientQuery(async () => {
      const response = await fetch(`${this.config.url}/chat/completions`, {
        method: "POST",
        headers: this.config.headers,
        body: JSON.stringify({
          model: this.config.model,
          temperature,
          max_tokens: 512,
          messages: [{ role: "system", content: message }],
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
