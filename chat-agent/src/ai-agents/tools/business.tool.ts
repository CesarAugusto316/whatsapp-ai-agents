import businessService from "@/services/business.service";
import { tool } from "ai";
import z from "zod";
import { parseInput } from "./helpers";
import { Appointment } from "@/types/business/cms-types";

const businessInfoSchema = z.object({
  businessId: z.uuid().describe("The uuid of the business"),
});

const dateTime = {
  day: z.string().describe("Day of the appointment in YYYY-MM-DD format"),
  // .optional()
  time: z
    .string()
    .describe("Date of the appointment in YYYY-MM-DDTHH:MM:SSZ format"),
};

export const BOOL = {
  YES: true,
  NO: false,
} as const;

// CUSTOMERS
export const getCustomerProfile = tool({
  name: "getCustomerProfile",
  description:
    "Get a costumer/user info/profile by providing their phone number and businessId",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      customerPhoneNumber: z.string().min(5).max(15),
    }),
  ),
  execute: async ({ businessId, customerPhoneNumber }) => {
    const customer = await businessService.getCostumerByPhone({
      "where[phoneNumber][like]": customerPhoneNumber,
      "where[business][equals]": businessId,
      limit: 1,
      depth: 0,
    });
    return customer;
  },
});

export const createNewCustomer = tool({
  name: "createNewCustomer",
  description:
    "Create a new customer for a business by providing their name, phone number",
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
// CUSTOMERS

// APPOINTMENTS
export const isScheduleAvailable = tool({
  // outputSchema
  // toModelOutput
  name: "isScheduleAvailable",
  description:
    "Check if a schedule is available for a business by providing its businessId, day, and time",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      ...dateTime,
    }),
  ),
  execute: async ({ businessId, day, time }) => {
    const appointments = await businessService.checkAvailability({
      "where[business][equals]": businessId ?? "",
      "where[day][equals]": day ?? "",
      "where[startDateTime][equals]": time ?? "",
      depth: 0,
    });
    const res = (await appointments.json()) as { docs: Appointment[] };
    // Implement the logic to fetch appointments using the businessId
    // Example: const appointments = await fetchAppointments(businessId);
    // Return the appointments as a string or object
    return res.docs.length === 0 ? BOOL.YES : BOOL.NO;
  },
});

export const getAppointmentById = tool({
  name: "getAppointmentById",
  description: "Get an appointment by its ID",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      appointmentId: z.string().min(5).max(20).describe("Appointment ID"),
    }),
  ),
  execute: async ({ appointmentId }) => {
    const appointment = await businessService.getAppointmentById(appointmentId);
    return appointment.json();
  },
});

export const getAppointmentByCustomerIdAndDayTime = tool({
  name: "getAppointmentByCustomerIdAndDate",
  description: "Get an appointment by businessId, customerId, day, and time",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      customerId: z.string().min(5).max(20).describe("Customer's ID"),
      ...dateTime,
    }),
  ),
  execute: async ({ businessId, customerId, day, time }) => {
    const appointment = await businessService.getAppointmentByCustomerIdAndDate(
      {
        "where[business][equals]": businessId,
        "where[customer][equals]": customerId,
        "where[day][equals]": day,
        "where[startDateTime][equals]": time,
        depth: 0,
      },
    );
    const res = (await appointment.json()) as { docs: Appointment[] };
    return res?.docs.at(0);
  },
});

export const createAppointment = tool({
  name: "createAppointment",
  description:
    "Create a new appointment for a customer by providing their customerId, phone number, day, and start time",
  inputSchema: z.preprocess(
    parseInput,
    businessInfoSchema.extend({
      customerId: z.string().min(5).max(20).describe("Customer's ID"),
      ...dateTime,
    }),
  ),
  execute: async ({ businessId, customerId, day, time }) => {
    const appointment = await businessService.createAppointment({
      business: businessId,
      customer: customerId,
      endDateTime: time + 60,
      startDateTime: time,
      day,
      status: "confirmed",
    });
    // Implement the logic to create an appointment using the provided information
    // Example: const appointmentInfo = await createAppointment(name, businessId, customerPhoneNumber, email, day, startDateTime);
    // Return the appointment information as a string or object
    return appointment.json();
  },
});

// export const updateAppointment = tool({
//   name: "updateAppointment",
//   description:
//     "Update an existing appointment for a customer at a specific business",
//   inputSchema: z.preprocess(
//     parseInput,
//     businessInfoSchema.extend({
//       customer: z.string().min(5).max(20).describe("Customer's ID"),
//       appointmentId: z.string().min(5).max(20).describe("Appointment ID"),
//       day: z.string().min(2).max(20).describe("Appointment day"),
//       startDateTime: z
//         .string()
//         .min(2)
//         .max(20)
//         .describe("Appointment start time"),
//     }),
//   ),
//   execute: async ({
//     customer,
//     businessId,
//     appointmentId,
//     day,
//     startDateTime,
//   }) => {
//     const appointment = await businessService.updateAppointment(appointmentId, {
//       day,
//       startDateTime,
//       business: businessId,
//       customer,
//     });
//     // Implement the logic to update an appointment using the provided information
//     // Example: const appointmentInfo = await updateAppointment(appointmentId, day, startDateTime);
//     // Return the appointment information as a string or object
//     return appointment.json();
//   },
//   // toModelOutput(),
// });
// APPOINTMENTS
