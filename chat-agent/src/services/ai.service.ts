import { z } from "zod";
import { generateText, tool } from "ai";
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
// .chatModel("@cf/ibm-granite/granite-4.0-h-micro");

const model = provider.chatModel("@cf/ibm-granite/granite-4.0-h-micro");
// const model = provider("@cf/ibm-granite/granite-4.0-h-micro");

/**
 *
 * @param prompt
 * @returns
 */
export function aiAgent(prompt: string) {
  return generateText({
    // providerOptions: {

    // },
    model,
    // system: "Eres un asistente que hacer reservas en restaurantes",
    // messages:[{}],
    prompt,
    // prompt: [{content: prompt || "Build me an AI agent on Cloudflare Workers", role: "user"}],
    // stopWhen: stepCountIs(5), // stop after a maximum of 5 steps if tools were called
    tools: {
      weather: tool({
        type: "function",
        description: "Get the weather in a location",
        inputSchema: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
      }),
      mesas: tool({
        description: "Obtener el numero de mesas disponibles en un restaurante",
        inputSchema: z.object({
          mesas: z.number().describe("El número de mesas disponibles"),
        }),
        execute: async ({ mesas }) => {
          //     const response = await fetch(
          //       "",
          //       // `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`
          //     );
          console.log({ mesas });
          return {
            mesas: 10,
            // temperature: 72 + Math.floor(Math.random() * 21) - 10,
          };
        },
      }),
    },
  });
}
