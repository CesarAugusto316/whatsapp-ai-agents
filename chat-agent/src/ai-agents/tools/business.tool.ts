import businessService from "@/services/business.service";
import { tool } from "ai";
import z from "zod";
import { parseInput } from "./helpers";

const businessInfoSchema = z.object({
  businessId: z.uuid().describe("The uuid of the business"),
});

export const getAppointments = tool({
  // outputSchema
  // toModelOutput
  description:
    "Get appointments for a business by providing its businessId, day, and startDateTime",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      // day: z.enum(WEEK_DAYS).describe("Day of the appointment").optional(),
      day: z
        .string()
        .describe("Day of the appointment in YYYY-MM-DD format")
        .optional(),
      startDateTime: z
        .string()
        .describe("Date of the appointment in YYYY-MM-DDTHH:MM:SSZ format")
        .optional(),
    }),
  ),
  execute: async ({ businessId, day, startDateTime }) => {
    const appointments = await businessService.getAppointments({
      "where[business][equals]": businessId ?? "",
      "where[day][equals]": day ?? "",
      "where[startDateTime][equals]": startDateTime ?? "",
      depth: 0,
    });
    // Implement the logic to fetch appointments using the businessId
    // Example: const appointments = await fetchAppointments(businessId);
    // Return the appointments as a string or object
    return appointments.json();
  },
});

export const getUserInfoByPhoneNumber = tool({
  description:
    "Get a costumer/user info/profile by providing their phone number and businessId",
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
      "where[phoneNumber][equals]": customerPhoneNumber ?? "",
      "where[business][equals]": businessId ?? "",
      limit: 1,
      depth: 0,
    });
    // Implement the logic to fetch costumer information using the phoneNumber
    // Example: const costumerInfo = await fetchCostumerInfo(phoneNumber);
    // Return the costumer information as a string or object
    return costumer.json();
  },
  
  // toModelOutput(),
});

export const checkAvailability = tool({
  description:
    "Check the availability of a business for a specific day and time",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      day: z
        .string()
        .min(10)
        .max(10)
        .describe("Day of the appointment in YYYY-MM-DD format")
        .optional(),
      startDateTime: z
        .string()
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
    // Implement the logic to check availability using the businessId, day, and startDateTime
    // Example: const availability = await checkAvailability(businessId, day, startDateTime);
    // Return the availability as a string or object
    return true; // BOOLEAN
  },
});
