import { z } from "zod";
import { CUSTOMER_INTENT, InputIntent } from "./booking.types";
import { logger } from "@/infraestructure/logging";

// Esquema mejorado con validaciones más claras
const dateTime = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date_format")
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, "invalid_date"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "invalid_time_format")
    .refine((time) => {
      const [hours, minutes, seconds] = time.split(":").map(Number);
      return (
        hours >= 0 &&
        hours < 24 &&
        minutes >= 0 &&
        minutes < 60 &&
        seconds >= 0 &&
        seconds < 60
      );
    }, "invalid_time"),
});

export const phase2 = z.object({
  customerName: z
    .string()
    .min(3, "too_short: Mínimo 3 caracteres")
    .max(30, "too_long: Máximo 30 caracteres")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      "invalid_format: Solo letras y espacios",
    ),

  datetime: z
    .object({
      start: dateTime,
      end: dateTime,
    })
    .refine(
      (data) => {
        if (
          !data.start.date ||
          !data.start.time ||
          !data.end.date ||
          !data.end.time
        ) {
          return true;
        }

        const startDateTime = new Date(`${data.start.date}T${data.start.time}`);
        const endDateTime = new Date(`${data.end.date}T${data.end.time}`);

        return endDateTime > startDateTime;
      },
      {
        message:
          "end_before_start: La hora de fin debe ser después de la hora de inicio",
        path: ["datetime"],
      },
    ),

  numberOfPeople: z
    .number()
    .int("not_integer: Debe ser un número entero")
    .min(1, "too_small: Mínimo 1 persona")
    .max(100, "too_large: Máximo 100 personas"),
});

// Función de mapeo mejorada con filtrado de errores humanos
export const mapZodErrorsToCollector = (
  zodError: z.ZodError | Partial<z.core.$ZodIssue>[],
) => {
  // Manejar diferentes formatos de entrada
  let issues: Partial<z.core.$ZodIssue>[] = [];

  // Caso 1: Es un objeto ZodError directo
  if (zodError && Array.isArray(zodError)) {
    issues = zodError;
  }
  // Caso 2: Está envuelto en un objeto con propiedad ZodError
  else if (zodError?.issues && Array.isArray(zodError?.issues)) {
    issues = zodError?.issues;
  }
  // Caso 3: Es un STRING que contiene el array JSON (¡NUEVO CASO CRÍTICO!)
  else if (typeof zodError === "string") {
    try {
      // Intenta encontrar el patrón "ZodError: [" y extraer el array JSON
      const match = (zodError as unknown as string).match(
        /ZodError:\s*(\[.*\])/s,
      );
      if (match) {
        const jsonArrayString = match[1];
        issues = JSON.parse(jsonArrayString);
      } else {
        logger.error("No se pudo extraer array ZodError del string:", zodError);
        return [];
      }
    } catch (parseError) {
      console.error(
        "Error parseando JSON extraído:",
        parseError,
        "Input:",
        (zodError as unknown as string).substring(0, 200),
      );
      return [];
    }
  }
  // Caso 4: Si no podemos extraer issues, retornar array vacío
  else {
    logger.error("Formato de ZodError no reconocido:", zodError);
    return [];
  }

  const fieldMap: Record<string, string> = {
    customerName: "customerName",
    "datetime.start.date": "startDate",
    "datetime.start.time": "startTime",
    "datetime.end.date": "endDate",
    "datetime.end.time": "endTime",
    numberOfPeople: "numberOfPeople",
    datetime: "datetime", // Para validación cruzada
  };

  // Recolectar errores primero
  const allErrors = issues.map((issue) => {
    const path = issue?.path?.join(".") ?? "";
    const field = fieldMap?.[path] || issue?.path?.[0];
    return {
      field,
      error: issue?.message || "",
    };
  });

  // Filtrar y priorizar errores: solo mantener los relevantes para humanos
  const filteredErrors: Array<{ field: PropertyKey; error: string }> = [];

  // Agrupar por campo para procesar múltiples errores
  const errorsByField: Record<
    string,
    Array<{ field: PropertyKey; error: string }>
  > = {};

  (allErrors ?? []).forEach((error) => {
    if (!errorsByField[error.field as string]) {
      errorsByField[error.field as string] = [];
    }
    if (typeof error === "object")
      errorsByField[error.field as string].push(
        error as { field: PropertyKey; error: string },
      );
  });

  // Para cada campo, seleccionar el error más relevante para humanos
  Object.keys(errorsByField).forEach((field) => {
    const fieldErrors = errorsByField[field];

    // Si solo hay un error, mantenerlo
    if (fieldErrors.length === 1) {
      filteredErrors.push(fieldErrors[0]);
      return;
    }

    // Para campos de fecha/hora: priorizar errores de FORMATO sobre errores técnicos
    if (field === "startDate" || field === "endDate") {
      // Prioridad: invalid_date_format > invalid_date
      const formatError = fieldErrors.find((e) =>
        e.error.includes("invalid_date_format"),
      );
      if (formatError) {
        filteredErrors.push(formatError);
      } else {
        filteredErrors.push(fieldErrors[0]); // Fallback al primer error
      }
    } else if (field === "startTime" || field === "endTime") {
      // Prioridad: invalid_time_format > invalid_time
      const formatError = fieldErrors.find((e) =>
        e.error.includes("invalid_time_format"),
      );
      if (formatError) {
        filteredErrors.push(formatError);
      } else {
        filteredErrors.push(fieldErrors[0]);
      }
    } else if (field === "customerName") {
      // Para nombre: priorizar errores de longitud sobre formato
      const lengthError = fieldErrors.find(
        (e) => e.error.includes("too_short") || e.error.includes("too_long"),
      );
      if (lengthError) {
        filteredErrors.push(lengthError);
      } else {
        // Si no hay error de longitud, usar el de formato
        const formatError = fieldErrors.find((e) =>
          e.error.includes("invalid_format"),
        );
        if (formatError) {
          filteredErrors.push(formatError);
        } else {
          filteredErrors.push(fieldErrors[0]);
        }
      }
    } else {
      // Para otros campos, usar el primer error
      filteredErrors.push(fieldErrors[0]);
    }
  });
  return filteredErrors;
};

export type BookingSchema = z.infer<typeof phase2>;

export const bookingSchemas = { phase2 };

export const customerIntentSchema = z.enum([
  CUSTOMER_INTENT.WHAT,
  CUSTOMER_INTENT.HOW,
]);

export const inputIntentSchema = z.enum([
  InputIntent.CUSTOMER_QUESTION,
  InputIntent.INPUT_DATA,
]);
