// import { createWorkersAI } from "workers-ai-provider";
// import { env } from "cloudflare:workers";

import { generateText, stepCountIs, tool } from "ai";
import { object, string } from "zod/v3";
// import * as z from "zod/v3";

// // Create a Workers AI instance
// const workersai = createWorkersAI({ binding: env.AI });
// // MORE INFO: https://developers.cloudflare.com/workers-ai/models/granite-4.0-h-micro/
// // DOCS: https://www.ibm.com/granite/docs/models/granite
// const model = workersai("@cf/ibm-granite/granite-4.0-h-micro");

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "cloudflare:workers";
// import { env } from "hono/adapter";

const model = createOpenAICompatible({
  name: "cloudflare",
  // apiKey: process.env.PROVIDER_API_KEY,
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${env?.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/ibm-granite/granite-4.0-h-micro`,
  headers: {
    Authorization: `Bearer ${env.CLOUDFLARE_AUTH_TOKEN}`,
  },
  includeUsage: true, // Include usage information in streaming responses
}).chatModel("@cf/ibm-granite/granite-4.0-h-micro");
// const model = provider("@cf/ibm-granite/granite-4.0-h-micro");

const { text } = await generateText({
  model,
  system: "You are an AI agent on Cloudflare Workers",
  prompt: "Build me an AI agent on Cloudflare Workers",
  stopWhen: stepCountIs(5), // stop after a maximum of 5 steps if tools were called
  tools: {
    // getWeather: tool({
    //   description: "Get the weather for a location",
    //   inputSchema: z.object({
    //     city: z.string().describe("The city to get the weather for"),
    //   }),
    //   execute: async ({ city }) => {
    //     const response = await fetch(
    //       "",
    //       // `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`
    //     );
    //     const data = await response.json();
    //     const weatherData = {
    //       location: {
    //         name: data.location.name,
    //         country: data.location.country,
    //         localtime: data.location.localtime,
    //       },
    //       current: {
    //         temp_c: data.current.temp_c,
    //         condition: {
    //           text: data.current.condition.text,
    //           code: data.current.condition.code,
    //         },
    //       },
    //     };
    //     return weatherData;
    //   },
    // }),
    weather: tool({
      description: "Get the weather in a location",
      inputSchema: object({
        location: string().describe("The location to get the weather for"),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
});
