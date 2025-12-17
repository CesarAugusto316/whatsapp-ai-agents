import businessService from "@/services/business.service";
import { tool } from "ai";
import z from "zod";
import { parseInput } from "./helpers";
import { Appointment } from "@/types/business/cms-types";

const businessInfoSchema = z.object({
  businessId: z.uuid().describe("The uuid of the business"),
});

export const BOOL = {
  YES: true,
  NO: false,
} as const;

export const isScheduleAvailable = tool({
  // outputSchema
  // toModelOutput
  name: "isScheduleAvailable",
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
    const appointments = await businessService.checkAvailability({
      "where[business][equals]": businessId ?? "",
      "where[day][equals]": day ?? "",
      "where[startDateTime][equals]": startDateTime ?? "",
      depth: 0,
    });
    const res = (await appointments.json()) as { docs: Appointment[] };
    // Implement the logic to fetch appointments using the businessId
    // Example: const appointments = await fetchAppointments(businessId);
    // Return the appointments as a string or object
    return res.docs.length === 0 ? BOOL.YES : BOOL.NO;
  },
});

export const createNewCustomer = tool({
  name: "createNewCustomer",
  description:
    "Get a costumer/user info/profile by providing their phone number and businessId",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      name: z.string().min(2).max(20).describe("Customer's name"),
      customerPhoneNumber: z
        .string()
        .min(5)
        .max(15)
        .describe("Customer's phone number"),
      email: z.email().describe("Customer's email").optional(),
    }),
  ),
  execute: async ({ name, businessId, customerPhoneNumber, email }) => {
    const costumer = await businessService.createCostumer({
      business: businessId,
      name,
      phoneNumber: customerPhoneNumber,
      email,
    });
    // Implement the logic to fetch costumer information using the phoneNumber
    // Example: const costumerInfo = await fetchCostumerInfo(phoneNumber);
    // Return the costumer information as a string or object
    return costumer.json();
  },
  // toModelOutput(),
});

export const createAppointment = tool({
  name: "createAppointment",
  description: "Create a new appointment for a customer at a specific business",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      name: z.string().min(2).max(20).describe("Customer's name"),
      customer: z.string().min(5).max(20).describe("Customer's ID"),
      //   .max(15)
      //   .describe("Customer's phone number"),
      // email: z.email().describe("Customer's email").optional(),
      day: z.string().min(2).max(20).describe("Appointment day"),
      startDateTime: z
        .string()
        .min(2)
        .max(20)
        .describe("Appointment start time"),
    }),
  ),
  execute: async ({ name, businessId, customer, day, startDateTime }) => {
    const appointment = await businessService.createAppointment({
      business: businessId,
      customer,
      endDateTime: startDateTime + 60,
      startDateTime,
      day,
      status: "pending",
    });
    // Implement the logic to create an appointment using the provided information
    // Example: const appointmentInfo = await createAppointment(name, businessId, customerPhoneNumber, email, day, startDateTime);
    // Return the appointment information as a string or object
    return appointment.json();
  },
  // toModelOutput(),
});

export const updateAppointment = tool({
  name: "updateAppointment",
  description:
    "Update an existing appointment for a customer at a specific business",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      customer: z.string().min(5).max(20).describe("Customer's ID"),
      appointmentId: z.string().min(5).max(20).describe("Appointment ID"),
      day: z.string().min(2).max(20).describe("Appointment day"),
      startDateTime: z
        .string()
        .min(2)
        .max(20)
        .describe("Appointment start time"),
    }),
  ),
  execute: async ({
    customer,
    businessId,
    appointmentId,
    day,
    startDateTime,
  }) => {
    const appointment = await businessService.updateAppointment(appointmentId, {
      day,
      startDateTime,
      business: businessId,
      customer,
    });
    // Implement the logic to update an appointment using the provided information
    // Example: const appointmentInfo = await updateAppointment(appointmentId, day, startDateTime);
    // Return the appointment information as a string or object
    return appointment.json();
  },
  // toModelOutput(),
});
