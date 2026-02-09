import z from "zod";
import { validationPrompts } from "@/domain/restaurant/booking/prompts";
import {
  mapZodErrorsToCollector,
  BookingSchema,
  bookingSchemas,
} from "@/domain/restaurant/booking/schemas";
import { aiAdapter } from "@/infraestructure/adapters/ai";
import type { Business } from "@/infraestructure/adapters/cms";
import { logger } from "@/infraestructure/logging";
import { mergeReservationData } from "@/application/use-cases/sagas/booking/helpers/merge-state";
import { ChatMessage } from "@/infraestructure/adapters/ai";

export const validatorAgent = {
  /**
   *
   * @description Validates the customer's input and returns a parsed object
   */
  async parseData(
    business: Business,
    customerMessage: string,
    previousState: BookingSchema,
  ) {
    const PARSER_PROMPT = validationPrompts.dataParser(business);
    const messages: ChatMessage[] = [
      { role: "system", content: PARSER_PROMPT },
      { role: "user", content: customerMessage },
    ];
    const aiValidator: string = await aiAdapter.generateText({ messages });

    // ✅ Required fields
    const rawObj = JSON.parse(aiValidator || "{}");
    const mergedData = mergeReservationData(rawObj, previousState);
    const parsedData = bookingSchemas.phase2.safeParse(mergedData);

    return {
      parsedData: {
        data: parsedData.data as BookingSchema,
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
  async collectMissingData(
    business: Business,
    errors: Partial<z.core.$ZodIssue>[],
    temp = 0,
  ) {
    const COLLECTOR_PROMPT = validationPrompts.humanizeErrors(business);
    const mappedErrors = mapZodErrorsToCollector(errors);

    logger.info("Errors mapped completed", mappedErrors);

    // Validar que hay errores para procesar
    if (!mappedErrors || mappedErrors.length === 0) {
      return "No se detectaron errores específicos para corregir.";
    }

    return aiAdapter.generateText({
      messages: [
        { role: "system", content: COLLECTOR_PROMPT },
        {
          role: "user",
          content: JSON.stringify(mappedErrors),
        },
      ],
    });
  },
};
