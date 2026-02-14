import { parseBookingData } from "@/application/use-cases/sagas/booking/workflows/helpers/input-parser/parse-booking-data";
import { describe, expect, test } from "bun:test";
import {
  getDayAfterTomorrowInTimezone,
  getTodayInTimezone,
  getTomorrowInTimezone,
} from "./date-parser-helpers";

describe("parseBookingData2 - Timezone-aware date parsing", () => {
  const timezones = [
    "America/Mexico_City",
    "Europe/Madrid",
    "America/Argentina/Buenos_Aires",
    "Asia/Tokyo",
  ];

  for (const tz of timezones) {
    test(`parses 'hoy' correctly in ${tz}`, () => {
      const message = "Mesa para 2 hoy a las 8pm";
      const result = parseBookingData(message, tz);
      const expected = getTodayInTimezone(tz);
      expect(result?.datetime?.start?.date).toBe(expected);
      expect(result?.datetime?.start?.time).toBe("20:00:00");
      expect(result.numberOfPeople).toBe(2);
    });

    test(`parses 'mañana' correctly in ${tz}`, () => {
      const message = "Reserva para 3 mañana a las 7pm";
      const result = parseBookingData(message, tz);
      const expected = getTomorrowInTimezone(tz);
      expect(result?.datetime?.start?.date).toBe(expected);
      expect(result?.datetime?.start?.time).toBe("19:00:00");
      expect(result.numberOfPeople).toBe(3);
    });

    test(`parses 'pasado mañana' correctly in ${tz}`, () => {
      const message = "Cita para 4 pasado mañana a las 6pm";
      const result = parseBookingData(message, tz);
      const expected = getDayAfterTomorrowInTimezone(tz);
      expect(result?.datetime?.start?.date).toBe(expected);
      expect(result?.datetime?.start?.time).toBe("18:00:00");
      expect(result.numberOfPeople).toBe(4);
    });
  }

  // Caso especial: prueba cruce de medianoche en diferentes zonas
  test("handles midnight crossing correctly across timezones", () => {
    const message = "Evento de 10pm a 1am para 5 personas";
    for (const tz of timezones) {
      const result = parseBookingData(message, tz);
      expect(result?.datetime?.start?.time).toBe("22:00:00");
      expect(result?.datetime?.end?.time).toBe("01:00:00");
      // La fecha de fin debe ser el día siguiente
      const start = new Date(result?.datetime?.start?.date as string);
      const end = new Date(result?.datetime?.end?.date as string);
      const diffDays =
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(1);
    }
  });
});
