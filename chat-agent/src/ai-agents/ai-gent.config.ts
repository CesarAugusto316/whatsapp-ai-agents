import {
  Experimental_Agent as Agent,
  generateObject,
  hasToolCall,
  stepCountIs,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "bun";
import {
  getReservationInfoByCustomerPhoneNumberAndDayTime,
  getReservationInfoById,
  isScheduleAvailable,
  makeReservation,
} from "./tools/restaurant/reservation.tools";
import z from "zod";
import { parseInput } from "./tools/helpers";
import { optionalDateTime } from "./tools/restaurant/schemas";

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

const config = {
  model: provider("@cf/ibm-granite/granite-4.0-h-micro"),
  maxOutputTokens: 2048, // 512, 1024
};

/**
 *
 * @description Configure the agent with the model, system prompt, tools, and stop conditions.
 * MORE INFO: https://ai-sdk.dev/docs/agents/loop-control
 */
export const makeReservationsAgent = new Agent({
  ...config,
  tools: {
    isScheduleAvailable,
    makeReservation,
  },
  stopWhen: [
    stepCountIs(10), // Maximum 10 steps
    hasToolCall("makeReservation"), // Stop after calling 'someTool'
  ],
  prepareStep: async ({ stepNumber, steps }) => {
    console.log({ stepNumber, steps });
    return {};
  },
  onStepFinish: async ({ toolResults }) => {
    console.log({ toolResults });
  },
});

/**
 *
 * @description Configure the agent with the model, system prompt, tools, and stop conditions.
 * MORE INFO: https://ai-sdk.dev/docs/agents/loop-control
 */
export const updateReservationsAgent = new Agent({
  ...config,
  tools: {
    // isScheduleAvailable,
    // updateReservation,
  },
  stopWhen: [
    stepCountIs(10), // Maximum 10 steps
    // hasToolCall("makeReservation"), // Stop after calling 'someTool'
  ],
  prepareStep: async ({ stepNumber, steps }) => {
    console.log({ stepNumber, steps });
    return {};
  },
  onStepFinish: async ({ toolResults }) => {
    console.log({ toolResults });
  },
});

/**
 *
 * @description Configure the agent with the model, system prompt, tools, and stop conditions.
 * MORE INFO: https://ai-sdk.dev/docs/agents/loop-control
 */
export const infoReservationAgent = new Agent({
  ...config,
  tools: {
    getReservationInfoById,
    getReservationInfoByCustomerPhoneNumberAndDayTime,
  },
  stopWhen: [
    stepCountIs(10), // Maximum 10 steps
    // hasToolCall("makeReservation"), // Stop after calling 'someTool'
  ],
  prepareStep: async ({ stepNumber, steps }) => {
    console.log({ stepNumber, steps });

    return {};
  },
  onStepFinish: async ({ toolResults }) => {
    console.log({ toolResults });
  },
});

export function routerAgent() {
  return generateObject({
    ...config,
    prompt: "",
    schema: z.preprocess(
      parseInput,
      z.object({
        actionType: z
          .enum([
            "infoReservation",
            "makeReservation",
            "updateReservation",
            "cancelReservation",
          ])
          .describe("The type of action to perform"),
        customerId: z.uuid().optional().describe("The ID of the customer"),
        reservationId: z.uuid().optional(),
        restaurantId: z.uuid().optional(),
        ...optionalDateTime,
      }),
    ),
  });
}
