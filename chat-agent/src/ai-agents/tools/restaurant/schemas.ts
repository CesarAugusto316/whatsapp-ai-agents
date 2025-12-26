import z from "zod";

export const dateTime = {
  day: z
    .string()
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      error: "Fecha debe estar en formato YYYY-MM-DD",
    })
    .describe("Day of the reservation in YYYY-MM-DD format"),
  time: z
    .string()
    .refine((val) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
      error: "Hora debe estar en formato HH:mm",
    })
    .describe("Date of the reservation in formato HH:mm"),
};

export const optionalDateTime = {
  day: z
    .string()
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      error: "Fecha debe estar en formato YYYY-MM-DD",
    })
    .describe("Day of the reservation in YYYY-MM-DD format")
    .optional(),
  time: z
    .string()
    .refine((val) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
      error: "Hora debe estar en formato HH:mm",
    })
    .describe("Date of the reservation in formato HH:mm")
    .optional(),
};
