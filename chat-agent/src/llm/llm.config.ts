import { generateText, ModelMessage, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "bun";
import { getReservationStatusById } from "./tools/restaurant/reservation.tools";
import {
  AgentArgs,
  CUSTOMER_INTENT,
  FlowOption,
  InputIntent,
  ReservationStatus,
} from "../types/reservation/reservation.types";
import { Business } from "@/types/business/cms-types";
import { safeParse, ZodError } from "zod";
import {
  customerIntentSchema,
  inputIntentSchema,
  mapZodErrorsToCollector,
  ReservationSchema,
  reservationSchemas,
} from "../types/reservation/schemas";
import { buildInfoReservationsSystemPrompt } from "./prompts/conversational-prompts";
import { CLASSIFIER_PROMPT } from "./prompts/classifier-prompts";
import { validationPrompts } from "./prompts/validation-prompts";
import { humanizerPrompt } from "./prompts/humanizer-prompt";
import { mergeReservationData } from "@/helpers/merge-state";

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
export function infoReservationAgent(
  { messages, business }: AgentArgs,
  ctxStatus?: ReservationStatus | FlowOption,
) {
  return generateText({
    ...config,
    // temperature: 0.2,
    system: buildInfoReservationsSystemPrompt(business, ctxStatus),
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
  temperature = 0.7,
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
export async function customerIntentClassifier(
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
export async function inputIntentClassifier(
  message: string,
): Promise<InputIntent> {
  try {
    const temperature = 0.1;
    const raw = await aiClient(
      [{ role: "user", content: message }],
      validationPrompts.intentClassifier(),
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

export const validationAgent = {
  /**
   *
   * @description Validates the customer's input and returns a parsed object
   */
  async parser(
    business: Business,
    customerMessage: string,
    previousState: ReservationSchema,
    temp = 0.1,
  ) {
    const PARSER_PROMPT = validationPrompts.dataParser(business);
    const messages: ModelMessage[] = [
      { role: "user", content: customerMessage },
    ];
    const aiValidator: string = await aiClient(messages, PARSER_PROMPT, temp);
    // ✨ Optional fields
    const phase1 = safeParse(
      reservationSchemas.phase1,
      JSON.parse(aiValidator),
    );
    if (!phase1.success) {
      console.log(phase1, aiValidator);
      return;
    }
    // ✅ Required fields
    const mergedData = mergeReservationData(phase1.data, previousState);
    const phase2 = safeParse(reservationSchemas.phase2, phase1.data);
    console.log({ phase1, phase2 });
    return { parsedData: phase2, mergedData };
  },

  /**
   *
   * @description converts ZodError into human readable message and asks to complete
   * the process
   * @param business
   * @param errors
   * @returns
   */
  async collector(business: Business, errors: ZodError, temp = 0.7) {
    const COLLECTOR_PROMPT = validationPrompts.collector(business);
    const mappedErrors = mapZodErrorsToCollector(errors);

    // Validar que hay errores para procesar
    if (!mappedErrors || mappedErrors.length === 0) {
      return "No se detectaron errores específicos para corregir.";
    }

    console.log({ errors, mappedErrors });
    const aiDataCollector = aiClient(
      [
        {
          role: "user",
          content: JSON.stringify(mappedErrors),
        },
      ],
      COLLECTOR_PROMPT,
      temp,
    );
    return aiDataCollector;
  },
};
