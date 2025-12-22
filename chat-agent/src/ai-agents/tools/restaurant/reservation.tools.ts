import businessService from "@/services/business.service";
import { tool } from "ai";
import z from "zod";
import { parseInput } from "../helpers";
import { Appointment, Customer } from "@/types/business/cms-types";
import { dateTime, optionalDateTime } from "./schemas";

export const TOOLS_NAME = {
  isScheduleAvailable: "isScheduleAvailable",
  getReservationStatusById: "getReservationStatusById",
  getReservationStatusByDateAndTime: "getReservationStatusByDateAndTime",
};

export const DESCRIPTIONS = {
  isScheduleAvailable:
    "Check if day and time is available for reservation. Use when the customer asks for availability before making a reservation, the customer must provide the date and time",
  getReservationStatusById:
    "Get reservation status by its ID. Use when the customer wants to know the status of a reservation that is already made, the customer must provide the reservation ID",
  getReservationStatusByDateAndTime:
    "Get reservation status by its date and time. Use when the customer forgot the reservation ID and wants to check the status of a reservation that is already made",
};

export const isScheduleAvailable = (restaurantId: string) =>
  tool({
    name: TOOLS_NAME.isScheduleAvailable,
    description: DESCRIPTIONS.isScheduleAvailable,
    inputSchema: z.preprocess(
      parseInput,
      z.object({
        ...dateTime,
      }),
    ),
    execute: async ({ day, time }) => {
      const appointments = await businessService.checkAvailability({
        "where[business][equals]": restaurantId ?? "",
        "where[day][equals]": day ?? "",
        "where[startDateTime][equals]": time ?? "",
        depth: 0,
      });
      const res = (await appointments.json()) as { docs: Appointment[] };
      // Implement the logic to fetch appointments using the businessId
      // Example: const appointments = await fetchAppointments(businessId);
      // Return the appointments as a string or object
      // return res.docs.length === 0 ? AVAILABLE.YES : AVAILABLE.NO;

      /** @todo save availability in redis, so we can know if this tool has been already been called */
      return res.docs.length === 0 ? "IS AVAILABLE" : "NOT AVAILABLE";
    },
  });

export const getReservationStatusById = () =>
  tool({
    name: TOOLS_NAME.getReservationStatusById,
    description: DESCRIPTIONS.getReservationStatusById,
    inputSchema: z.preprocess(
      parseInput,
      z.object({
        reservationId: z.string().min(5).max(20).describe("Reservation ID"),
      }),
    ),
    execute: async ({ reservationId }) => {
      const reservation =
        await businessService.getAppointmentById(reservationId);
      // const result = JSON.stringify(await reservation.json());
      // console.log({ result });

      // IMPORTANT: EL LLM SI INTERPRETA EL CONTENIDO EN FORMATO JSON, ENTRE MAS
      // SEMANTICA  ES LA RESPUESTA, MAS PROBABLE ES QUE EL LLM LA INTERPRETE
      // CORRECTAMENTE
      // return {
      //   status: "found",
      //   data: "confirmada para el día Martes proximo",
      // };
      // {ERRORL "NOT FOUND"}
      return reservation.json();
    },
  });

export const getReservationStatusByDateAndTime = (
  restaurantId: string,
  customerPhoneNumber: string,
) =>
  tool({
    name: TOOLS_NAME.getReservationStatusByDateAndTime,
    description: DESCRIPTIONS.getReservationStatusByDateAndTime,
    inputSchema: z.preprocess(
      parseInput,
      z.object({
        ...optionalDateTime,
      }),
    ),
    execute: async ({ day, time }) => {
      const customer = await businessService.getCostumerByPhone({
        "where[business][equals]": restaurantId,
        "where[phoneNumber][like]": customerPhoneNumber,
        depth: 0,
        limit: 1,
      });
      if (!customer) {
        // throw new Error("Customer not found");
        return { error: "Customer not found" };
      }
      const reservation =
        await businessService.getAppointmentByCustomerIdAndDate({
          "where[business][equals]": restaurantId,
          "where[customer][equals]": customer?.id,
          "where[day][equals]": day, // OPTIONAL
          "where[startDateTime][equals]": time, // OPTIONAL
          sort: "-createdAt",
          limit: 1,
          depth: 0,
        });
      const res = (await reservation.json()) as { docs: Appointment[] };
      // console.log({ res });
      return res.docs.at(0);
    },
  });

export const makeReservation = (
  restaurantId: string,
  customerPhoneNumber: string,
) =>
  tool({
    // name: TOOLS_NAME.makeReservation,
    description:
      "Make a reservation for a customer by providing customerName, customerPhoneNumber, day and time",
    inputSchema: z.preprocess(
      parseInput,
      z.object({
        customerName: z.string().min(3).max(18).describe("Customer's name"),
        ...dateTime,
      }),
    ),
    execute: async ({ day, time, customerName }) => {
      let customer!: Customer | undefined;
      if (customerPhoneNumber) {
        customer = await businessService.getCostumerByPhone({
          "where[business][equals]": restaurantId,
          "where[phoneNumber][like]": customerPhoneNumber,
          depth: 0,
          limit: 1,
        });
      }
      if (!customer && !customerName) {
        return { error: "Name is required" };
      }
      // If the user is new, create a new customer
      if (!customer && customerName) {
        customer = (
          (await (
            await businessService.createCostumer({
              business: restaurantId,
              phoneNumber: customerPhoneNumber,
              name: customerName,
            })
          ).json()) as { doc: Customer }
        ).doc;
      }
      // if customer exists and name is different, update customer
      if (customer && customerName !== customer.name) {
        customer = (
          (await (
            await businessService.updateCostumer(customer.id, {
              business: restaurantId,
              phoneNumber: customerPhoneNumber,
              name: customerName,
            })
          ).json()) as { doc: Customer }
        ).doc;
      }
      // FINALLY, CREATE RESERVATION
      if (customer?.id && restaurantId) {
        const reservation = await businessService.createAppointment({
          business: restaurantId,
          customer: customer.id,
          endDateTime: time + 60,
          startDateTime: time,
          day,
          status: "confirmed",
        });
        return ((await reservation.json()) as { doc: Appointment }).doc;
      }
      if (!customer) {
        return { error: "Customer not found" };
      }
      return null;
    },
  });

//  TODO: updateResevertion TOOL
