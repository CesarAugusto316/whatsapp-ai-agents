import { parseBookingData } from "@/domain/restaurant/booking";
import { describe, expect, test } from "bun:test";
import {
  getTodayInTimezone,
  getTomorrowInTimezone,
  getDayAfterTomorrowInTimezone,
  getNextSpecificDayInTimezone,
} from "./date-parser-helpers";

describe("parseBookingData - Next specific day parsing", () => {
  const timezones = [
    "America/Mexico_City",
    "Europe/Madrid",
    "America/Argentina/Buenos_Aires",
    "Asia/Tokyo",
  ];

  // Day index mapping: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dayIndices: Record<string, number> = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sábado: 6,
  };

  // Test "el proximo X dia" (the next specific day)
  for (const tz of timezones) {
    test(`parses 'el proximo viernes' correctly in ${tz}`, () => {
      const message = "Reserva para 2 el proximo viernes a las 7pm";
      const result = parseBookingData(message, tz);
      const expectedDate = getNextSpecificDayInTimezone(5, tz); // Friday = 5

      expect(result.numberOfPeople).toBe(2);
      expect(result?.datetime?.start?.time).toBe("19:00:00");
      expect(result?.datetime?.start?.date).toBe(expectedDate);
    });

    test(`parses 'el próximo lunes' correctly in ${tz}`, () => {
      const message = "Evento para 4 el próximo lunes a las 8pm";
      const result = parseBookingData(message, tz);
      const expectedDate = getNextSpecificDayInTimezone(1, tz); // Monday = 1

      expect(result.numberOfPeople).toBe(4);
      expect(result?.datetime?.start?.time).toBe("20:00:00");
      expect(result?.datetime?.start?.date).toBe(expectedDate);
    });

    test(`parses 'el proximo martes' correctly in ${tz}`, () => {
      const message = "Cita para 3 el proximo martes a las 6pm";
      const result = parseBookingData(message, tz);
      const expectedDate = getNextSpecificDayInTimezone(2, tz); // Tuesday = 2

      expect(result.numberOfPeople).toBe(3);
      expect(result?.datetime?.start?.time).toBe("18:00:00");
      expect(result?.datetime?.start?.date).toBe(expectedDate);
    });

    test(`parses 'el próximo jueves' correctly in ${tz}`, () => {
      const message = "Reunión para 5 el próximo jueves a las 10am";
      const result = parseBookingData(message, tz);
      const expectedDate = getNextSpecificDayInTimezone(4, tz); // Thursday = 4

      expect(result.numberOfPeople).toBe(5);
      expect(result?.datetime?.start?.time).toBe("10:00:00");
      expect(result?.datetime?.start?.date).toBe(expectedDate);
    });
  }

  // Test variations with different accents and forms
  test("handles 'el próximo sábado' correctly", () => {
    const message = "Comida para 6 el próximo sábado a las 1pm";
    const result = parseBookingData(message, "America/Mexico_City");
    const expectedDate = getNextSpecificDayInTimezone(6, "America/Mexico_City"); // Saturday = 6

    expect(result.numberOfPeople).toBe(6);
    expect(result?.datetime?.start?.time).toBe("13:00:00");
    expect(result?.datetime?.start?.date).toBe(expectedDate);
  });

  test("handles 'el proximo domingo' correctly", () => {
    const message = "Celebración para 10 el proximo domingo a las 12pm";
    const result = parseBookingData(message, "America/Mexico_City");
    const expectedDate = getNextSpecificDayInTimezone(0, "America/Mexico_City"); // Sunday = 0

    expect(result.numberOfPeople).toBe(10);
    expect(result?.datetime?.start?.time).toBe("12:00:00");
    expect(result?.datetime?.start?.date).toBe(expectedDate);
  });

  test("handles 'el proximo miércoles' correctly", () => {
    const message = "Entrevista para 1 el proximo miércoles a las 9am";
    const result = parseBookingData(message, "America/Mexico_City");
    const expectedDate = getNextSpecificDayInTimezone(3, "America/Mexico_City"); // Wednesday = 3

    expect(result.numberOfPeople).toBe(1);
    expect(result?.datetime?.start?.time).toBe("09:00:00");
    expect(result?.datetime?.start?.date).toBe(expectedDate);
  });

  test("handles 'pasado mañana' correctly", () => {
    const message = "Entrevista pasado mañana a las 9am para 1 person";
    const result = parseBookingData(message, "America/Mexico_City");

    const afterTomorrow = getDayAfterTomorrowInTimezone("America/Mexico_City");

    expect(result.numberOfPeople).toBe(1);
    expect(result?.datetime?.start?.time).toBe("09:00:00");
    expect(result?.datetime?.start?.date).toBe(afterTomorrow);
  });
});
