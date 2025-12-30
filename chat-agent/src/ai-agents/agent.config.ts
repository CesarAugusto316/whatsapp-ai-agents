import { generateText, ModelMessage, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "bun";
import { getReservationStatusById } from "./tools/restaurant/reservation.tools";
import {
  buildInfoReservationsSystemPrompt,
  CLASSIFIER_PROMPT,
  dataValidationPrompts,
  humanizerPrompt,
} from "./tools/prompts";
import { AgentArgs, CUSTOMER_INTENT, InputIntent } from "./agent.types";
import { safeParse } from "zod";
import { customerIntentSchema, inputIntentSchema } from "./schemas";

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
      getReservationStatusById: getReservationStatusById(),
    },
    stopWhen: [
      stepCountIs(10), // Maximum 10 steps
    ],
  });
}

/**
 *
 * @param messages
 * @param prompt
 * @param temperature
 * @returns
 */
export async function aiClient(
  messages: ModelMessage[],
  prompt: string,
  temperature = 0.8,
): Promise<string> {
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
        temperature,
        messages: [{ role: "system", content: prompt }, ...messages],
      }),
    })
  ).json()) as { choices: { message: { content: string } }[] };

  const content = response?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No se recibió respuesta del humanizer agent");
  }
  return content;
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
  try {
    const temperature = 0.1;
    const raw = await aiClient(
      [{ role: "user", content: message }],
      CLASSIFIER_PROMPT,
      temperature,
    ); // Llamamos a aiClient usando CLASSIFIER_PROMPT como system

    const { success, data } = safeParse(customerIntentSchema, raw);
    if (success) return data;
    return CUSTOMER_INTENT.WHAT; // fallback
  } catch (err) {
    console.error("Error clasificando la intención del usuario:", err);
    return CUSTOMER_INTENT.WHAT; // fallback en caso de error
  }
}

/**
 *
 * @description Classifies the customer intent based on the conversation history.
 * @param messages
 * @returns
 */
export async function inputClassIntent(message: string): Promise<InputIntent> {
  try {
    const temperature = 0.1;
    const raw = await aiClient(
      [{ role: "user", content: message }],
      dataValidationPrompts.intentClassifier(),
      temperature,
    ); // Llamamos a aiClient usando CLASSIFIER_PROMPT como system

    const { success, data } = safeParse(inputIntentSchema, raw);
    if (success) return data;
    return InputIntent.CUSTOMER_QUESTION; // fallback
  } catch (err) {
    console.error("Error clasificando la intención del usuario:", err);
    return InputIntent.CUSTOMER_QUESTION; // fallback en caso de error
  }
}

export async function humanizerAgent(message: string, temperature = 0.5) {
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
        temperature,
        messages: [{ role: "system", content: humanizerPrompt(message) }],
      }),
    })
  ).json()) as { choices: { message: { content: string } }[] };

  const content = response?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No se recibió respuesta del humanizer agent");
  }
  return content;
}
