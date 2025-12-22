import {
  Experimental_Agent as Agent,
  generateText,
  hasToolCall,
  ModelMessage,
  stepCountIs,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env, fetch } from "bun";
import {
  getReservationStatusByDateAndTime,
  getReservationStatusById,
  isScheduleAvailable,
  makeReservation,
} from "./tools/restaurant/reservation.tools";
import {
  buildInfoReservationsSystemPrompt,
  RESERVATION_SYSTEM_PROMPT,
  ROUTER_AGENT_PROMPT,
  systemPrompt,
} from "./tools/prompts";
import z, { safeParse } from "zod";
import { AgentArgs, ROUTING_AGENT } from "./agent.types";

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

const model = "@cf/ibm-granite/granite-4.0-h-micro"; // "@cf/meta/llama-4-scout-17b-16e-instruct"; // "@cf/ibm-granite/granite-4.0-h-micro"

const config = {
  model: provider(model),
  maxOutputTokens: 2048, // 512, 1024
};

/**
 *
 * @description Configure the agent with the model, system prompt, tools, and stop conditions.
 * MORE INFO: https://ai-sdk.dev/docs/agents/loop-control
 */
function updateReservationsAgent(args: AgentArgs) {
  return new Agent({
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
}

/**
 *
 * @description Configure the agent with the model, system prompt, tools, and stop conditions.
 * MORE INFO: https://ai-sdk.dev/docs/agents/loop-control
 */
function makeReservationsAgent({
  messages,
  business,
  customerPhone,
}: AgentArgs) {
  return generateText({
    ...config,
    system: RESERVATION_SYSTEM_PROMPT.CREATE,
    prompt: messages,
    tools: {
      makeReservation: makeReservation(business.id, customerPhone),
    },
    stopWhen: [
      stepCountIs(5), // Maximum 10 steps
      hasToolCall("makeReservation"), // Stop after calling 'someTool'
    ],
  });
}

/**
 *
 * @description Configure the agent with the model, system prompt, tools, and stop conditions.
 * MORE INFO: https://ai-sdk.dev/docs/agents/loop-control
 */
export function infoReservationAgent({
  messages,
  business,
  customerPhone,
}: AgentArgs) {
  return generateText({
    ...config,
    temperature: 0.2,
    system: buildInfoReservationsSystemPrompt(business),
    messages,
    tools: {
      isScheduleAvailable: isScheduleAvailable(business.id),
      getReservationStatusById: getReservationStatusById(),
    },
    stopWhen: [
      stepCountIs(10), // Maximum 10 steps
    ],
  });
}

/**
 *
 * @description Router agent that routes the conversation to the appropriate agent based on the user's intent.
 * @param messages
 * @returns
 */
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
        model,
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
      ROUTING_AGENT.InfoReservation,
      ROUTING_AGENT.MakeReservation,
      ROUTING_AGENT.UpdateReservation,
      ROUTING_AGENT.CancelReservation,
    ]),
    raw,
  );
  if (success) return data;
  else {
    return ROUTING_AGENT.InfoReservation;
  }
}

/**
 *
 * @see routerAgent
 * @description options for the router agent
 */
export const agenticOptions = {
  infoReservation: infoReservationAgent,
  makeReservation: makeReservationsAgent,
  updateReservation: updateReservationsAgent,
  cancelReservation: () => {
    return Promise.resolve([]);
  },
};
