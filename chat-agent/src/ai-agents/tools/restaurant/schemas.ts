import z from "zod";

// export const restaurantInfoSchema = z.object({
//   restaurantId: z.uuid().describe("The restaurant's id"),
// });

export const dateTime = {
  day: z.string().describe("Day of the reservation in YYYY-MM-DD format"),
  time: z
    .string()
    .describe("Date of the reservation in YYYY-MM-DDTHH:MM:SSZ format"),
};

export const optionalDateTime = {
  day: z
    .string()
    .describe("Day of the reservation in YYYY-MM-DD format")
    .optional(),
  time: z
    .string()
    .describe("Date of the reservation in YYYY-MM-DDTHH:MM:SSZ format")
    .optional(),
};

// export const customerPhoneNumber = z
//   .string()
//   .min(5)
//   .max(20)
//   .describe("Customer's phone number");
