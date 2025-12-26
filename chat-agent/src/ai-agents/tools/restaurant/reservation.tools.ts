import businessService from "@/services/business.service";
import { tool } from "ai";
import z from "zod";
import { parseInput } from "../helpers";
import { dateTime } from "./schemas";

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
      const business = await businessService.getBusinessById(restaurantId);
      const appointments = await businessService.checkAvailability(
        day,
        time,
        business.schedule.averageTime * 60,
      );

      /** @todo save availability in redis, so we can know if this tool has been already been called */
      return appointments ? "IS AVAILABLE" : "NOT AVAILABLE";
    },
  });

export const getReservationStatusById = () =>
  tool({
    name: TOOLS_NAME.getReservationStatusById,
    description: DESCRIPTIONS.getReservationStatusById,
    inputSchema: z.preprocess(
      parseInput,
      z.object({
        reservationId: z.string().min(5).max(30).describe("Reservation ID"),
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
