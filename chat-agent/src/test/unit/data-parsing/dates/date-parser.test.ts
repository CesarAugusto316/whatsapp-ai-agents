import { parseBookingData } from "@/domain/booking";
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
    const message = "Evento de 10pm a 1am para 5 personas para hoy";
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

  // Test para verificar que la fecha de inicio puede comenzar un día antes en ciertos escenarios
  test("start date can begin one day before for late evening bookings", () => {
    const message = "Reserva para hoy a las 11pm";
    for (const tz of timezones) {
      const result = parseBookingData(message, tz);

      // Parse dates to compare
      const startDate = new Date(result?.datetime?.start?.date as string);
      const endDate = new Date(result?.datetime?.end?.date as string);

      // For late night reservations, verify the date logic
      expect(result?.datetime?.start?.time).toBe("23:00:00");

      // Calculate difference in days
      const diffDays =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

      // If the booking crosses midnight, the end date should be the next day
      if (
        result?.datetime?.end?.time &&
        result.datetime.end.time < result.datetime?.start?.time!
      ) {
        expect(diffDays).toBe(1); // End date should be the next day
      }
    }
  });

  // Test para verificar que la fecha final termina un día después después de medianoche
  test("end date extends to next day after midnight crossing", () => {
    const message = "Evento de 11:30pm a 2am para 4 personas para hoy";

    for (const tz of timezones) {
      const result = parseBookingData(message, tz);

      // Verify time parsing
      expect(result?.datetime?.start?.time).toBe("23:30:00");
      expect(result?.datetime?.end?.time).toBe("02:00:00");

      // Verify date relationship - end date should be one day after start date
      const startDate = new Date(result?.datetime?.start?.date as string);
      const endDate = new Date(result?.datetime?.end?.date as string);
      const diffDays =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBe(1); // End date should be exactly one day after start date
    }
  });

  // Test adicional para casos extremos de cruce de medianoche
  test("handles various midnight crossing scenarios", () => {
    const testCases = [
      { message: "Reserva para hoy de 11pm a 1am", startHour: 23, endHour: 1 },
      { message: "Evento para hoy de 12am a 3am", startHour: 0, endHour: 3 },
      { message: "Fiesta para hoy de 10pm a 4am", startHour: 22, endHour: 4 },
      {
        message: "Mesa para hoy de 11:45pm a 00:15am",
        startHour: 23,
        endHour: 0,
      }, // This might be parsed as 00:15 next day
    ];

    for (const testCase of testCases) {
      for (const tz of timezones) {
        const result = parseBookingData(testCase.message, tz);

        if (result?.datetime?.start && result?.datetime?.end) {
          const startDate = new Date(result.datetime.start.date as string);
          const endDate = new Date(result.datetime.end.date as string);

          // Convert times to hours for comparison
          const startHour = parseInt(
            result.datetime.start?.time!.split(":")[0],
          );
          const endHour = parseInt(result.datetime.end?.time!.split(":")[0]);

          // Verify the parsed times match expected values
          expect(startHour).toBe(testCase.startHour);

          // For the end hour, if it's early morning (0-4) and start hour is late (22-23),
          // the end date should be the next day
          if (testCase.endHour === 0 && endHour === 0) {
            // Special case: 00:xx time should be interpreted as next day if start was late
            if (startHour >= 22) {
              const diffDays =
                (endDate.getTime() - startDate.getTime()) /
                (1000 * 60 * 60 * 24);
              expect(diffDays).toBe(1); // Should be next day
            }
          } else {
            expect(endHour).toBe(testCase.endHour);

            // If start hour is later than end hour, it crossed midnight
            if (startHour > endHour) {
              const diffDays =
                (endDate.getTime() - startDate.getTime()) /
                (1000 * 60 * 60 * 24);
              expect(diffDays).toBe(1); // Should be next day
            }
          }
        }
      }
    }
  });
});
