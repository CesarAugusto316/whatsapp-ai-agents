import { z } from "zod";
import { CUSTOMER_INTENT, InputIntent } from "./agent.types";

// Schema para fecha YYYY-MM-DD
const daySchema = z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
  error: "Fecha debe estar en formato YYYY-MM-DD",
});

// Schema para hora HH:mm (24h)
const timeSchema = z
  .string()
  .refine((val) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
    error: "Hora debe estar en formato HH:mm",
  });

export const reserveSchema = z.object({
  name: z.string().min(2).max(20).optional(),
  startTime: timeSchema,
  endTime: timeSchema,
  day: daySchema,
  numberOfPeople: z.number("Debe ser un número").min(1).max(500),
});

export const reservationSchemaWithDates = z.object({
  customerName: z.string().max(30),
  day: z.iso.datetime(),
  startDateTime: z.iso.datetime(),
  endDateTime: z.iso.datetime(),
  numberOfPeople: z.number().int().positive().min(1).max(100),
  error: z.string().optional(),
});

export const customerIntentSchema = z.enum([
  CUSTOMER_INTENT.WHAT,
  CUSTOMER_INTENT.HOW,
]);

export const inputIntentSchema = z.enum([
  InputIntent.CUSTOMER_QUESTION,
  InputIntent.INPUT_DATA,
]);
