import z from "zod";
import { validationPrompts } from "@/domain/restaurant/reservations/prompts/validation-prompts";
import {
  mapZodErrorsToCollector,
  ReservationSchema,
  reservationSchemas,
} from "@/domain/restaurant/reservations/schemas";
import { aiClient } from "@/infraestructure/http/ai/ai.client";
import { ModelMessage } from "@/infraestructure/http/ai/llm.types";
import { Business } from "@/infraestructure/http/cms/cms-types";
import { logger } from "@/infraestructure/logging/logger";
import { mergeReservationData } from "@/application/workflows/reservations/helpers/merge-state";

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
