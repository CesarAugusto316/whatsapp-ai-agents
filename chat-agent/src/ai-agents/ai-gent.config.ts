import {
  Experimental_Agent as Agent,
  hasToolCall,
  ModelMessage,
  stepCountIs,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env, fetch } from "bun";
import {
  getReservationInfoByCustomerPhoneNumberAndDayTime,
  getReservationInfoById,
  isScheduleAvailable,
  makeReservation,
} from "./tools/restaurant/reservation.tools";
import { RESERVATION, ROUTER_AGENT_PROMPT, ROUTING } from "./tools/helpers";
import z, { safeParse } from "zod";

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
export const makeReservationsAgent = new Agent({
  ...config,
  tools: {
    makeReservation,
  },
  stopWhen: [
    stepCountIs(5), // Maximum 10 steps
    hasToolCall("makeReservation"), // Stop after calling 'someTool'
  ],
});

/**
 *
 * @description Configure the agent with the model, system prompt, tools, and stop conditions.
 * MORE INFO: https://ai-sdk.dev/docs/agents/loop-control
 */
export const infoReservationAgent = new Agent({
  ...config,
  tools: {
    isScheduleAvailable,
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

export async function routerAgent(messages: ModelMessage[]) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env?.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`;
  const headers = {
    Authorization: `Bearer ${env.CLOUDFLARE_AUTH_TOKEN}`,
  };
  const response = (await (
    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "@cf/ibm-granite/granite-4.0-h-micro",
        messages: [
          { role: "system", content: ROUTER_AGENT_PROMPT },
          ...messages,
        ],
      }),
    })
  ).json()) as { choices: { message: { content: string } }[] };

  const raw = response?.choices?.at(0)?.message?.content?.trim() ?? "";
  const { success, data } = safeParse(
    z.enum([
      ROUTING.InfoReservation,
      ROUTING.MakeReservation,
      ROUTING.UpdateReservation,
      ROUTING.CancelReservation,
    ]),
    raw,
  );
  if (success) return data;
  else {
    return ROUTING.InfoReservation;
  }
}

// const lastMessage = ((messages.at(-1)?.content as string) || "")
//   .trim()
//   .toUpperCase();
// const rawLastMsg = safeParse(
//   z.enum([
//     RESERVATION.CREATE_TRIGGER,
//     RESERVATION.UPDATE_TRIGGER,
//     RESERVATION.DELETE_TRIGGER,
//   ]),
//   lastMessage,
// );
