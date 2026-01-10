import { env } from "bun";
import {
  CUSTOMER_INTENT,
  InputIntent,
} from "../types/reservation/reservation.types";
import { Business } from "@/types/business/cms-types";
import z, { ZodError } from "zod";
import {
  customerIntentSchema,
  inputIntentSchema,
  mapZodErrorsToCollector,
  ReservationSchema,
  reservationSchemas,
} from "../types/reservation/schemas";
import { CLASSIFIER_PROMPT } from "./prompts/classifier-prompts";
import { validationPrompts } from "./prompts/validation-prompts";
import { humanizerPrompt } from "./prompts/humanizer-prompt";
import { mergeReservationData } from "@/helpers/merge-state";
import { ModelMessage } from "@/types/hono.types";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { logger } from "@/middlewares/logger-middleware";

const model = "@cf/ibm-granite/granite-4.0-h-micro"; // "@cf/meta/llama-4-scout-17b-16e-instruct";

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

    const { success, data } = customerIntentSchema.safeParse(raw);
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

    const { success, data } = inputIntentSchema.safeParse(raw);
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

export const validatorAgent = {
  /**
   *
   * @description Validates the customer's input and returns a parsed object
   */
  async parse(
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

    // ✅ Required fields
    const rawObj = JSON.parse(aiValidator || "{}");
    const mergedData = mergeReservationData(rawObj, previousState);
    const parsedData = reservationSchemas.phase2.safeParse(mergedData);

    return {
      parsedData: {
        data: parsedData.data as ReservationSchema,
        success: parsedData.success,
        errors: (parsedData.error?.issues ?? []).map((issue) => ({
          path: issue.path as PropertyKey[],
          code: issue.code,
          message: issue.message,
        })),
      },
      mergedData,
    };
  },

  /**
   *
   * @description converts ZodError into human readable message and asks to complete
   * the process
   * @param business
   * @param errors
   * @returns
   */
  async humanizeErrors(
    business: Business,
    errors: Partial<z.core.$ZodIssue>[],
    temp = 0.7,
  ) {
    const COLLECTOR_PROMPT = validationPrompts.humanizeErrors(business);
    const mappedErrors = mapZodErrorsToCollector(errors);

    logger.info("Errors mapped completed", mappedErrors);

    // Validar que hay errores para procesar
    if (!mappedErrors || mappedErrors.length === 0) {
      return "No se detectaron errores específicos para corregir.";
    }

    return aiClient(
      [
        {
          role: "user",
          content: JSON.stringify(mappedErrors),
        },
      ],
      COLLECTOR_PROMPT,
      temp,
    );
  },
};
