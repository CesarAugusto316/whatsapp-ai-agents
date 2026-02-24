import { validationPrompts } from "@/domain/booking/prompts";
import { aiAdapter } from "@/infraestructure/adapters/ai";
import type { Business } from "@/infraestructure/adapters/cms";
import { logger } from "@/infraestructure/logging";
import {
  extractCustomerName,
  parseBookingData,
} from "@/domain/booking/input-parser";
import {
  bookingSchema,
  BookingSchema,
  mapZodErrorsToCollector,
} from "@/domain/booking/input-parser/booking-schemas";
import { bookingStateManager } from "@/application/services/state-managers";
import z from "zod";

/**
 * Verifica si customerName es el único campo requerido faltante.
 * Si es así, retorna true para aplicar lógica especial de captura de nombre.
 */
function isOnlyCustomerNameMissing(
  mergedData: Partial<BookingSchema>,
): boolean {
  // Si ya tiene customerName, no aplica
  if (mergedData.customerName) return false;

  // Verificar todos los campos requeridos excepto customerName
  const hasStartDate =
    mergedData.datetime?.start.date !== undefined &&
    mergedData.datetime.start.date !== null;
  const hasStartTime =
    mergedData.datetime?.start.time !== undefined &&
    mergedData.datetime.start.time !== null;

  const hasEndDate =
    mergedData.datetime?.end.date !== undefined &&
    mergedData.datetime?.end.date !== null;
  const hasEndTime =
    mergedData.datetime?.end.time !== undefined &&
    mergedData.datetime?.end.time !== null;

  const hasNumberOfPeople =
    mergedData.numberOfPeople !== undefined &&
    mergedData.numberOfPeople !== null;

  // customerName es el único faltante si todos los demás están presentes
  return (
    hasNumberOfPeople &&
    hasStartDate &&
    hasStartTime &&
    hasEndDate &&
    hasEndTime
  );
}

export const validatorAgent = {
  /**
   *
   * @description Validates the customer's input and returns a parsed object
   */
  parseData(customerMessage: string, previousState: BookingSchema) {
    const rawObj = parseBookingData(customerMessage);
    const mergedData = bookingStateManager.mergeState(rawObj, previousState);

    // 🎯 Caso especial: si solo falta customerName, todo el input es el nombre
    const onlyNameMissing = isOnlyCustomerNameMissing(mergedData);
    if (onlyNameMissing && customerMessage.trim()) {
      const customerName = extractCustomerName(customerMessage.trim());
      mergedData.customerName = customerName;
      logger.info("Customer name captured from raw input", { customerMessage });
    }

    console.log({ rawObj, previousState, mergedData });
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
      useAuxModel: true,
      temperature: temp,
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
