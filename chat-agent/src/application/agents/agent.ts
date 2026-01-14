import { CLASSIFIER_PROMPT } from "@/domain/restaurant/reservations/prompts/classifier-prompts";
import { humanizerPrompt } from "@/domain/restaurant/reservations/prompts/humanizer-prompt";
import { validationPrompts } from "@/domain/restaurant/reservations/prompts/validation-prompts";
import {
  CUSTOMER_INTENT,
  InputIntent,
} from "@/domain/restaurant/reservations/reservation.types";
import {
  customerIntentSchema,
  inputIntentSchema,
  mapZodErrorsToCollector,
  ReservationSchema,
  reservationSchemas,
} from "@/domain/restaurant/reservations/schemas";
import { aiClient } from "@/infraestructure/http/ai/ai.client";
import { ModelMessage } from "@/infraestructure/http/ai/llm.types";
import { Business } from "@/infraestructure/http/cms/cms-types";
import { mergeReservationData } from "../workflows/reservations/helpers/merge-state";
import { logger } from "@/infraestructure/logging/logger";
import z from "zod";

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
    const raw = await aiClient.userMsg(
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
    const raw = await aiClient.userMsg(
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

export async function humanizerAgent(message: string, temp = 0.5) {
  const content = await aiClient.systemMsg(humanizerPrompt(message), temp);
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
    const aiValidator: string = await aiClient.userMsg(
      messages,
      PARSER_PROMPT,
      temp,
    );

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

    return aiClient.userMsg(
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
