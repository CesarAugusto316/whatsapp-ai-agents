import businessService from "@/services/business.service";
import { tool } from "ai";
import z from "zod";
import { parseInput } from "./helpers";

const businessInfoSchema = z.object({
  businessId: z.uuid().describe("The uuid of the business"),
});

// export const getBusinessInfo = tool({
//   description: "Get information about a business by providing its businessId",
//   inputSchema: z.preprocess(parseInput, businessInfoSchema),
//   execute: async ({ businessId }) => {
//     const business = await businessService.getBusinessById(businessId);
//     // Implement the logic to fetch business information using the businessId
//     // Example: const businessInfo = await fetchBusinessInfo(businessId);
//     // Return the business information as a string or object
//     return business;
//   },
// });

export const getAppointments = tool({
  // outputSchema
  // toModelOutput
  description:
    "Get appointments for a business by providing its businessId, day, and startDateTime",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      // day: z.enum(WEEK_DAYS).describe("Day of the appointment").optional(),
      day: z.iso
        .date()
        .describe("Day of the appointment in YYYY-MM-DD format")
        .optional(),
      startDateTime: z.iso
        .datetime()
        .describe("Date of the appointment in YYYY-MM-DDTHH:MM:SSZ format")
        .optional(),
    }),
  ),
  execute: async ({ businessId, day, startDateTime }) => {
    const appointments = await businessService.getAppointments({
      "where[business][equals]": businessId,
      "where[day][equals]": day,
      "where[startDateTime][equals]": startDateTime,
      depth: 0,
    });
    // Implement the logic to fetch appointments using the businessId
    // Example: const appointments = await fetchAppointments(businessId);
    // Return the appointments as a string or object
    return appointments.json();
  },
});

export const getCostumerInfoByPhoneNumber = tool({
  description: "Get a costumer by providing their phone number and businessId",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      customerPhoneNumber: z
        .string()
        .min(5)
        .max(15)
        .describe("Customer's phone number"),
    }),
  ),
  execute: async ({ customerPhoneNumber, businessId }) => {
    const costumer = await businessService.getCostumerByPhone({
      "where[phoneNumber][equals]": customerPhoneNumber,
      "where[business][equals]": businessId,
      limit: 1,
      depth: 0,
    });
    // Implement the logic to fetch costumer information using the phoneNumber
    // Example: const costumerInfo = await fetchCostumerInfo(phoneNumber);
    // Return the costumer information as a string or object
    return costumer.json();
  },
});
