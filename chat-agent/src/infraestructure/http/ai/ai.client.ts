import { env } from "bun";
import { ChatCompletionResponse, ChatMessage } from "./";
import { resilientCall } from "@/application/patterns";

class AiClient {
  private config =
    env.NODE_ENV === "test"
      ? {
          /**
           *
           * @link https://docs.ollama.com/api/openai-compatibility
           */
          url: "http://localhost:11434/v1/chat/completions",
          model: "granite4:micro-h", // local ollama model
        }
      : {
          url: `https://api.cloudflare.com/client/v4/accounts/${env?.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
          model: "@cf/ibm-granite/granite-4.0-h-micro", //"@cf/meta/llama-4-scout-17b-16e-instruct";
          headers: {
            Authorization: `Bearer ${env.CLOUDFLARE_AUTH_TOKEN}`,
          },
        };

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
    return resilientCall(
      async () => {
        const response = await fetch(this.config.url, {
          method: "POST",
          headers: this.config.headers,
          body: JSON.stringify({
            model: this.config.model,
            temperature,
            messages: [{ role: "system", content: prompt }, ...messages],
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
      },
      { builtIn: "llm" },
    );
  }

  async systemMsg(message: string, temperature = 0) {
    return resilientCall(
      async () => {
        const response = await fetch(this.config.url, {
          method: "POST",
          headers: this.config.headers,
          body: JSON.stringify({
            model: this.config.model,
            temperature,
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
      },
      { builtIn: "llm" },
    );
  }
}

export default new AiClient();
