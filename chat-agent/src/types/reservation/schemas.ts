import { z } from "zod";
import { CUSTOMER_INTENT, InputIntent } from "./reservation.types";

export const phase1 = z
  .object({
    customerName: z.string(),
    dateTime: z
      .object({
        start: z
          .object({
            date: z.string(),
            time: z.string(),
          })
          .partial(),
        end: z
          .object({
            date: z.string(),
            time: z.string(),
          })
          .partial(),
      })
      .partial(),
    numberOfPeople: z.number(),
  })
  .partial();

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
        )
          return true;

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

// Función de mapeo mejorada
export const mapZodErrorsToCollector = (zodError: z.ZodError) => {
  const fieldMap: Record<string, string> = {
    customerName: "customerName",
    "datetime.start.date": "startDate",
    "datetime.start.time": "startTime",
    "datetime.end.date": "endDate",
    "datetime.end.time": "endTime",
    numberOfPeople: "numberOfPeople",
    datetime: "datetime", // Para validación cruzada
  };

  return zodError.issues.map((issue) => {
    const path = issue.path.join(".");
    const field = fieldMap[path] || issue.path[0];

    return {
      field,
      error: issue.message || "",
    };
  });
};

export type ReservationSchema = z.infer<typeof phase2>;

export const reservationSchemas = { phase1, phase2 };

export const customerIntentSchema = z.enum([
  CUSTOMER_INTENT.WHAT,
  CUSTOMER_INTENT.HOW,
]);

export const inputIntentSchema = z.enum([
  InputIntent.CUSTOMER_QUESTION,
  InputIntent.INPUT_DATA,
]);
