import { z } from "zod";
import { CUSTOMER_INTENT, InputIntent } from "./agent.types";

export const phase1 = z
  .object({
    customerName: z.string(),
    startDateTime: z.iso.datetime(),
    endDateTime: z.iso.datetime(),
    numberOfPeople: z.number(),
  })
  .partial();

export const phase2 = z.object({
  customerName: z.string().min(3).max(30),
  startDateTime: z.iso.datetime(),
  endDateTime: z.iso.datetime(),
  numberOfPeople: z.number().int().positive().min(1).max(100),
});

export const reservationSchemas = { phase1, phase2 };

export const customerIntentSchema = z.enum([
  CUSTOMER_INTENT.WHAT,
  CUSTOMER_INTENT.HOW,
]);

export const inputIntentSchema = z.enum([
  InputIntent.CUSTOMER_QUESTION,
  InputIntent.INPUT_DATA,
]);
