import { env } from "bun";
import {
  ChatCompletionResponse,
  ChatMessage,
} from "./open-ai-compatible.types";

const model = "@cf/ibm-granite/granite-4.0-h-micro"; // "@cf/meta/llama-4-scout-17b-16e-instruct";

class AiClient {
  async userMsg(
    messages: ChatMessage[],
    prompt: string,
    /**
     * must be set to 0 in some cases
     * @link https://www.ibm.com/granite/docs/models/granite
     */
    temperature = 0,
    max_completion_tokens?: number,
    response_format = { type: "json_object" }, // "json_schema"
    tools?: Record<string, any>[],
  ): Promise<string> {
    //
    const url = `https://api.cloudflare.com/client/v4/accounts/${env?.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`;
    const headers = {
      Authorization: `Bearer ${env.CLOUDFLARE_AUTH_TOKEN}`,
    };
    const response = (await (
      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          temperature,
          messages: [{ role: "system", content: prompt }, ...messages],
        }),
      })
    ).json()) as ChatCompletionResponse;

    const content = response?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("No se recibió respuesta de la AI");
    }
    return content;
  }

  async systemMsg(message: string, temperature = 0) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${env?.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`;
    const headers = {
      Authorization: `Bearer ${env.CLOUDFLARE_AUTH_TOKEN}`,
    };
    const response = (await (
      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          temperature,
          messages: [{ role: "system", content: message }],
        }),
      })
    ).json()) as ChatCompletionResponse;

    const content = response?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("No se recibió respuesta de la AI");
    }
    return content;
  }
}

export const aiClient = new AiClient();
