import { Experimental_Agent as Agent, hasToolCall, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { weather } from "./tools/weather.tool";
// import { tools } from ".";

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

/**
 *
 * @description Configure the agent with the model, system prompt, tools, and stop conditions.
 * MORE INFO: https://ai-sdk.dev/docs/agents/loop-control
 */
export const aiAgent = new Agent({
  model: provider("@cf/ibm-granite/granite-4.0-h-micro"),
  maxOutputTokens: 1024, // 512, 1024
  system: `
    Eres un asistente que hacer reservas en restaurantes
    Writing style:
     - Use clear, simple language
     - Avoid jargon unless necessary
     - Structure information with headers and bullet points
  `,
  tools: {
    weather,
  },
  // toolChoice: {
  //   type: "tool",
  //   toolName: "weather", // Force the weather tool to be used
  // },
  stopWhen: [
    stepCountIs(20), // Maximum 20 steps
    hasToolCall("weather"), // Stop after calling 'someTool'
  ],
  prepareStep: async ({ messages }) => {
    // Keep only recent messages to stay within context limits
    if (messages.length > 20) {
      return {
        messages: [
          messages[0], // Keep system message
          ...messages.slice(-10), // Keep last 10 messages
        ],
      };
    }
    return {};
  },
  onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
    // your own logic, e.g. for saving the chat history or recording usage
  },
});
