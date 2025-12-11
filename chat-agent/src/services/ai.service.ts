import { generateText, stepCountIs, tool } from "ai";
import * as z from "zod/v3";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 *
 * @description provider("@cf/ibm-granite/granite-4.0-h-micro");
 * MORE INFO: https://developers.cloudflare.com/workers-ai/models/granite-4.0-h-micro/
 * DOCS: https://www.ibm.com/granite/docs/models/granite
 */
const model = createOpenAICompatible({
  name: "cloudflare",
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env?.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/ibm-granite/granite-4.0-h-micro`,
  headers: {
    Authorization: `Bearer ${process.env.CLOUDFLARE_AUTH_TOKEN}`,
  },
  // includeUsage: true, // Include usage information in streaming responses
}).chatModel("@cf/ibm-granite/granite-4.0-h-micro");

/**
 *
 * @param prompt
 * @returns
 */
export function callAI(prompt: string) {
  return generateText({
    model,
    system: "Eres un asistente que hacer reservas en restaurantes",
    // messages:[{}],
    prompt,
    // prompt: [{content: prompt || "Build me an AI agent on Cloudflare Workers", role: "user"}],
    stopWhen: stepCountIs(5), // stop after a maximum of 5 steps if tools were called
    tools: {
      weather: tool({
        description: "Obtener el numero de mesas disponibles en un restaurante",
        inputSchema: z.object({
          tables: z.string().describe("El número de mesas disponibles"),
        }),
        execute: async ({ tables }) => {
          //     const response = await fetch(
          //       "",
          //       // `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`
          //     );
          return {
            tables: 10,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          };
        },
      }),
    },
  });
}
