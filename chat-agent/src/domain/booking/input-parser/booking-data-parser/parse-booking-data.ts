import { z } from "zod";
import { extractNumberOfPeople } from "./extract-number-of-people";
import { extractDateTime } from "./extract-date-time";
import { extractCustomerName } from "./extract-customer-name";

const dateTime = z
  .object({
    date: z.string().optional(), // formato YYYY-MM-DD
    time: z.string().optional(), // formato HH:MM:SS
  })
  .partial();

// Definición del esquema de respuesta
const BookingDataSchema = z
  .object({
    customerName: z.string(),
    datetime: z.object({
      start: dateTime,
      end: dateTime,
    }),
    numberOfPeople: z.number().int().min(0).max(50),
  })
  .partial();

export type ParsedBookingData = z.infer<typeof BookingDataSchema>;

/**
 * Parsea datos de reserva desde un mensaje de texto en lenguaje natural
 * @param message Mensaje de texto en lenguaje natural
 * @param timezone Zona horaria para interpretar las fechas/tiempos
 * @param referenceDate Fecha de referencia para interpretar fechas relativas (por defecto: fecha actual)
 * @returns Objeto con los datos de reserva parseados
 */
export function parseBookingData(
  message: string,
  timezone: string = "America/Mexico_City",
  referenceDate: Date = new Date(),
  averageDurationMinutes: number = 60,
): ParsedBookingData {
  const normalizedMessage = message.trim();
  const numberOfPeople = extractNumberOfPeople(normalizedMessage);
  const customerName = extractCustomerName(message);

  console.log({ customerName });

  const { startDate, startTime, endDate, endTime } = extractDateTime(
    normalizedMessage,
    timezone,
    referenceDate,
    averageDurationMinutes,
  );

  const result = BookingDataSchema.parse({
    customerName,
    datetime: {
      start: { date: startDate, time: startTime },
      end: { date: endDate, time: endTime },
    },
    numberOfPeople,
  });

  return result;
}
