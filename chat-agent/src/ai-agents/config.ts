import {
  Experimental_Agent as Agent,
  hasToolCall,
  stepCountIs,
  tool,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env, RedisClient } from "bun";
import {
  getAppointments,
  getCostumerInfoByPhoneNumber,
} from "./tools/business.tool";

export const redis = new RedisClient(env.REDIS_URL);

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
  // system: ,
  tools: {
    // getBusinessInfo,
    getAppointments,
    getCostumerInfoByPhoneNumber,
  },
  // toolChoice: {
  //   type: "tool",
  //   toolName: "getCostumerInfoByPhoneNumber", // Force the weather tool to be used
  // },
  stopWhen: [
    stepCountIs(20), // Maximum 20 steps
    // hasToolCall("weather"), // Stop after calling 'someTool'
  ],
  // pr
  // prepareStep: async ({ messages, steps }) => {
  //   // redisClient.lpush("chat:123", JSON.stringify({ cat: "cat 01" }))
  //   // redisClient.rpush("chat:123", JSON.stringify({ cat: "cat 02" }));
  //   // redisClient.expire("chat:123", 4000_000);
  //   console.log({ messages, steps });
  //   // messages.at(0).
  //   // Keep only recent messages to stay within context limits
  //   if (messages.length > 30) {
  //     return {
  //       messages: [
  //         messages[0], // Keep system message
  //         ...messages.slice(-10), // Keep last 10 messages
  //       ],
  //     };
  //   }
  //   return {};
  // },
  // onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
  //   // your own logic, e.g. for saving the chat history or recording usage
  //   console.log({ finish: "finished" });
  //   // redisClient.lpush("tasks:123", JSON.stringify({ cat: "cat 01" }));
  //   // redisClient.rpush("tasks", JSON.stringify({ cat: "cat 02" }));
  //   // redisClient.expire("tasks", 4000_000);
  // },
});
