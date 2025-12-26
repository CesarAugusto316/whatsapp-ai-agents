import { generateText, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "bun";
import {
  getReservationStatusById,
  isScheduleAvailable,
} from "./tools/restaurant/reservation.tools";
import {
  buildInfoReservationsSystemPrompt,
  CLASSIFIER_PROMPT,
} from "./tools/prompts";
import { AgentArgs, CUSTOMER_INTENT } from "./agent.types";
import { safeParse } from "zod";
import { customerIntentSchema } from "./schemas";

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
export function infoReservationAgent({ messages, business }: AgentArgs) {
  return generateText({
    ...config,
    // temperature: 0.2,
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
 * @description Classifies the customer intent based on the conversation history.
 * @param messages
 * @returns
 */
export async function classifyCustomerIntent(
  message: string,
): Promise<CUSTOMER_INTENT> {
  //
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
          { role: "system", content: CLASSIFIER_PROMPT },
          { role: "user", content: message },
        ],
      }),
    })
  ).json()) as { choices: { message: { content: string } }[] };

  const raw = response?.choices?.at(0)?.message?.content?.trim() ?? "";
  const { success, data } = safeParse(customerIntentSchema, raw);
  if (success) return data;
  else {
    return CUSTOMER_INTENT.WHAT;
  }
}
