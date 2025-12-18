import { Experimental_Agent as Agent, hasToolCall, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env, RedisClient } from "bun";
import {
  isScheduleAvailable,
  makeReservation,
  getCustomerProfile,
  getReservationInfoByCustomerIdAndDayTime,
  getReservationInfoById,
} from "./tools/business.tool";

/**
 *
 * @description provider("@cf/ibm-granite/granite-4.0-h-micro");
 * MORE INFO: https://developers.cloudflare.com/workers-ai/models/granite-4.0-h-micro/
 * DOCS: https://www.ibm.com/granite/docs/models/granite
 */
const provider = createOpenAICompatible({
  name: "cloudflare",
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${env?.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
  headers: {
    Authorization: `Bearer ${env.CLOUDFLARE_AUTH_TOKEN}`,
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
  maxOutputTokens: 2048, // 512, 1024
  tools: {
    isScheduleAvailable,
    getReservationInfoByCustomerIdAndDayTime,
    getReservationInfoById,
    getCustomerProfile,

    makeReservation,
    // createNewCustomer,
  },
  // toolChoice: {
  //   type: "tool",
  //   toolName: "isScheduleAvailable", // Force the weather tool to be used
  // },
  stopWhen: [
    stepCountIs(20), // Maximum 20 steps
    // hasToolCall("weather"), // Stop after calling 'someTool'
  ],
  onStepFinish: async ({ toolResults }) => {},
});

export const redis = new RedisClient(env.REDIS_URL);
