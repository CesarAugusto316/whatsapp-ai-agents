import { generateText, ModelMessage, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "bun";
import { getReservationStatusById } from "./tools/restaurant/reservation.tools";
import {
  buildInfoReservationsSystemPrompt,
  CLASSIFIER_PROMPT,
  parserPrompts,
  humanizerPrompt,
} from "./tools/prompts";
import {
  AgentArgs,
  CUSTOMER_INTENT,
  FlowOption,
  InputIntent,
  ReservationInput,
  ReservationStatus,
} from "./agent.types";
import { Business } from "@/types/business/cms-types";
import z, { safeParse, ZodError } from "zod";
import {
  customerIntentSchema,
  inputIntentSchema,
  reservationSchemas,
} from "./schemas";

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
  ctxStatus?: ReservationStatus|FlowOption,
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
      parserPrompts.intentClassifier(),
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

function extractMissingFields(zodError: z.ZodError): string[] {
  const fields = new Set<string>();

  for (const issue of zodError.issues) {
    const field = issue.path[0];
    if (typeof field === "string") {
      fields.add(field);
    }
  }

  return [...fields];
}

/** @todo DELETE day and Only keep startDateTime, startDateTime. THEN CHANGE THE PROMPT */
const FIELD_MAP: Record<string, string> = {
  customerName: "customerName",
  day: "date",
  startDateTime: "time",
  endDateTime: "time",
  numberOfPeople: "numberOfPeople",
};

function toConversationalFields(fields: string[]) {
  return [...new Set(fields.map((f) => FIELD_MAP[f]).filter(Boolean))];
}

export const validationAgent = {
  /**
   *
   * @description Validates the customer's input and returns a parsed object
   */
  async parser(
    business: Business,
    customerMessage: string,
    previousState: ReservationInput,
    temp = 0.2,
  ) {
    const PARSER_PROMPT = parserPrompts.dataParser(business);
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
      return;
    }
    const mergeState = {
      customerName: phase1.data?.customerName || previousState.customerName,
      day: phase1.data?.day || previousState.day,
      startDateTime: phase1.data?.startDateTime || previousState.startDateTime,
      endDateTime: phase1.data?.endDateTime || previousState.endDateTime,
      numberOfPeople:
        phase1.data?.numberOfPeople || previousState.numberOfPeople,
      //
    } satisfies ReservationInput;

    // ✅ Required fields
    const phase2 = safeParse(reservationSchemas.phase2, mergeState);
    return { parsedData: phase2, mergedData: mergeState };
  },

  /**
   *
   * @description converts ZodError into human readable message and asks to complete
   * the process
   * @param business
   * @param error
   * @returns
   */
  async collector(
    business: Business,
    error: ZodError<ReservationInput>,
    temp = 0.6,
  ) {
    const COLLECTOR_PROMPT = parserPrompts.collector(business);
    // ISSUES:
    // {
    //    "origin": "number",
    //    "code": "too_small",
    //    "minimum": 1,
    //    "inclusive": true,
    //    "path": [
    //      "numberOfPeople"
    //    ],
    //    "message": "Too small: expected number to be >=1"
    //  }
    const conversationalContext = {
      missingFields: toConversationalFields(extractMissingFields(error)),
      lastError: error.issues.at(0)?.message,
    };
    const aiDataCollector = aiClient(
      [
        {
          role: "user",
          /** @todo improve COLLECTOR_PROMPT and INPUT_SCHEMA (content message)  */
          content: `
              Context for clarification:
              missingFields: ${JSON.stringify(conversationalContext.missingFields)}
              error: ${conversationalContext.lastError}
            `,
        },
      ],
      COLLECTOR_PROMPT,
      temp,
    );
    return aiDataCollector;
  },
};
