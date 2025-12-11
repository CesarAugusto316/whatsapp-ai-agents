import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 *
 * @description provider("@cf/ibm-granite/granite-4.0-h-micro");
 * MORE INFO: https://developers.cloudflare.com/workers-ai/models/granite-4.0-h-micro/
 * DOCS: https://www.ibm.com/granite/docs/models/granite
 */
const provider = createOpenAICompatible({
  name: "cloudflare",
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env?.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
  headers: {
    Authorization: `Bearer ${process.env.CLOUDFLARE_AUTH_TOKEN}`,
  },
  // includeUsage: true, // Include usage information in streaming responses
});

export const model = provider("@cf/ibm-granite/granite-4.0-h-micro");

/**
 *
 * @description Parse input string to object
 * @param arg input schema from LLM that is passed to the ai-sdk for tool decision
 * @returns
 */
export const parseInput = (arg: string | Record<string, string>) => {
  if (typeof arg === "string") {
    try {
      // El modelo devuelve un string con comillas externas y JSON dentro.
      // Primero, quitamos las comillas exteriores.
      let str = arg.trim();
      if (str.startsWith('"') && str.endsWith('"')) {
        str = str.slice(1, -1);
      }
      // Parseamos el JSON interno
      return JSON.parse(str);
    } catch (error) {
      // Si falla, devolvemos el argumento original para que la validación falle
      console.error("Failed to parse input:", arg, error);
      return {};
    }
  }
  // Si no es string, lo devolvemos tal cual (debería ser objeto)
  return arg;
};
