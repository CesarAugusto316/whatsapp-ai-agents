import { z } from "zod";
import { CUSTOMER_INTENT, InputIntent } from "./agent.types";

export const reservationSchema = z.object({
  customerName: z.string().min(3).max(30),
  day: z.iso.datetime(),
  startDateTime: z.iso.datetime(),
  endDateTime: z.iso.datetime(),
  numberOfPeople: z.number().int().positive().min(1).max(100),
});

export const customerIntentSchema = z.enum([
  CUSTOMER_INTENT.WHAT,
  CUSTOMER_INTENT.HOW,
]);

export const inputIntentSchema = z.enum([
  InputIntent.CUSTOMER_QUESTION,
  InputIntent.INPUT_DATA,
]);
