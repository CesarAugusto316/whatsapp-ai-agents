import { parseInput } from "@/helpers/helpers";
import businessService from "@/services/business.service";
import { tool } from "ai";
import z from "zod";

export const TOOLS_NAME = {
  isScheduleAvailable: "isScheduleAvailable",
  getReservationStatusById: "getReservationStatusById",
  getReservationStatusByDateAndTime: "getReservationStatusByDateAndTime",
};

const DESCRIPTIONS = {
  isScheduleAvailable:
    "Check if day and time is available for reservation. Use when the customer asks for availability before making a reservation, the customer must provide the date and time",
  getReservationStatusById:
    "Get reservation status by its ID. Use when the customer wants to know the status of a reservation that is already made, the customer must provide the reservation ID",
  getReservationStatusByDateAndTime:
    "Get reservation status by its date and time. Use when the customer forgot the reservation ID and wants to check the status of a reservation that is already made",
};

export const getReservationStatusById = () =>
  tool({
    name: TOOLS_NAME.getReservationStatusById,
    description: DESCRIPTIONS.getReservationStatusById,
    inputSchema: z.preprocess(
      parseInput,
      z.object({
        reservationId: z.string().min(5).max(50).describe("Reservation ID"),
      }),
    ),
    // IMPORTANT: EL LLM SI INTERPRETA EL CONTENIDO EN FORMATO JSON, ENTRE MAS
    // SEMANTICA  ES LA RESPUESTA, MAS PROBABLE ES QUE EL LLM LA INTERPRETE
    // CORRECTAMENTE
    // return {
    //   status: "found",
    //   data: "confirmada para el día Martes proximo",
    // };
    execute: async ({ reservationId }) => {
      const reservation =
        await businessService.getAppointmentById(reservationId);
      return reservation.json();
    },
  });
