import { validationPrompts } from "@/domain/booking/prompts";
import { aiAdapter } from "@/infraestructure/adapters/ai";
import type { Business } from "@/infraestructure/adapters/cms";
import { logger } from "@/infraestructure/logging";
import { parseBookingData } from "@/domain/booking/input-parser";
import {
  bookingSchema,
  BookingSchema,
  mapZodErrorsToCollector,
} from "@/domain/booking/input-parser/booking-schemas";
import { bookingStateManager } from "@/application/services/state-managers";
import z from "zod";

export const validatorAgent = {
  /**
   *
   * @description Validates the customer's input and returns a parsed object
   */
  parseData(customerMessage: string, previousState: BookingSchema) {
    const rawObj = parseBookingData(customerMessage);
    const partial = bookingSchema.partial().parse(rawObj);
    const mergedData = bookingStateManager.mergeState(partial, previousState);
    // ✅ Required fields
    const parsedData = bookingSchema.safeParse(mergedData);
    return {
      parsedData: {
        data: parsedData.data as BookingSchema,
        success: parsedData.success,
        errors: (parsedData.error?.issues ?? []).map(
          (
            issue: z.core.$ZodIssue,
          ): { path: PropertyKey[]; code: string; message: string } => ({
            path: issue.path as PropertyKey[],
            code: issue.code,
            message: issue.message,
          }),
        ) as z.core.$ZodIssue[],
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
