import { parseBookingData } from "@/domain/restaurant/booking";
import { describe, expect, test } from "bun:test";
import {
  getNextWeekSpecificDayInTimezone,
  getNextSpecificDayInTimezone,
} from "./date-parser-helpers";

describe("parseBookingData - Week-relative date parsing", () => {
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

  // Test "la semana que viene X dia" (the upcoming week X day)
  for (const tz of timezones) {
    test(`parses 'la semana que viene X dia' correctly in ${tz}`, () => {
      const daysOfWeek = [
        { spanish: "lunes", index: 1 },
        { spanish: "martes", index: 2 },
        { spanish: "miércoles", index: 3 },
        { spanish: "jueves", index: 4 },
        { spanish: "viernes", index: 5 },
        { spanish: "sábado", index: 6 },
        { spanish: "domingo", index: 0 },
      ];

      for (const day of daysOfWeek) {
        const message = `Reserva para 2 la semana que viene ${day.spanish} a las 7pm`;
        const result = parseBookingData(message, tz);
        const expectedDate = getNextWeekSpecificDayInTimezone(day.index, tz);

        // The date should be the next occurrence of the specified day in the following week
        expect(result.numberOfPeople).toBe(2);
        expect(result?.datetime?.start?.time).toBe("19:00:00");
        expect(result?.datetime?.start?.date).toBe(expectedDate);
      }
    });

    test(`parses 'la próxima semana X dia' correctly in ${tz}`, () => {
      const daysOfWeek = [
        { spanish: "lunes", index: 1 },
        { spanish: "martes", index: 2 },
        { spanish: "miércoles", index: 3 },
        { spanish: "jueves", index: 4 },
        { spanish: "viernes", index: 5 },
        { spanish: "sábado", index: 6 },
        { spanish: "domingo", index: 0 },
      ];

      for (const day of daysOfWeek) {
        const message = `Evento para 4 la próxima semana ${day.spanish} a las 8pm`;
        const result = parseBookingData(message, tz);
        const expectedDate = getNextWeekSpecificDayInTimezone(day.index, tz);

        expect(result.numberOfPeople).toBe(4);
        expect(result?.datetime?.start?.time).toBe("20:00:00");
        expect(result?.datetime?.start?.date).toBe(expectedDate);
      }
    });

    test(`parses 'el proximo X dia' correctly in ${tz}`, () => {
      const daysOfWeek = [
        { spanish: "lunes", index: 1 },
        { spanish: "martes", index: 2 },
        { spanish: "miércoles", index: 3 },
        { spanish: "jueves", index: 4 },
        { spanish: "viernes", index: 5 },
        { spanish: "sábado", index: 6 },
        { spanish: "domingo", index: 0 },
      ];

      for (const day of daysOfWeek) {
        const message = `Cita para 3 el próximo ${day.spanish} a las 6pm`;
        const result = parseBookingData(message, tz);
        const expectedDate = getNextSpecificDayInTimezone(day.index, tz);

        expect(result.numberOfPeople).toBe(3);
        expect(result?.datetime?.start?.time).toBe("18:00:00");
        expect(result?.datetime?.start?.date).toBe(expectedDate);
      }
    });

    test(`parses 'el proximo X dia' with accent correctly in ${tz}`, () => {
      const daysOfWeek = [
        { spanish: "lunes", index: 1 },
        { spanish: "martes", index: 2 },
        { spanish: "miércoles", index: 3 },
        { spanish: "jueves", index: 4 },
        { spanish: "viernes", index: 5 },
        { spanish: "sábado", index: 6 },
        { spanish: "domingo", index: 0 },
      ];

      for (const day of daysOfWeek) {
        const message = `Reunión para 5 el próximo ${day.spanish} a las 10am`;
        const result = parseBookingData(message, tz);
        const expectedDate = getNextSpecificDayInTimezone(day.index, tz);

        expect(result.numberOfPeople).toBe(5);
        expect(result?.datetime?.start?.time).toBe("10:00:00");
        expect(result?.datetime?.start?.date).toBe(expectedDate);
      }
    });
  }

  // Test specific scenarios
  test("handles 'el martes de la semana que viene' correctly", () => {
    const message = "Reserva para 2 el martes de la semana que viene a las 7pm";
    const result = parseBookingData(message, "America/Mexico_City");
    const expectedDate = getNextWeekSpecificDayInTimezone(
      2,
      "America/Mexico_City",
    );

    expect(result.numberOfPeople).toBe(2);
    expect(result?.datetime?.start?.time).toBe("19:00:00");
    expect(result?.datetime?.start?.date).toBe(expectedDate);
  });

  test("handles 'el viernes de la próxima semana' correctly", () => {
    const message = "Evento para 6 el viernes de la próxima semana a las 8pm";
    const result = parseBookingData(message, "America/Mexico_City");
    const expectedDate = getNextWeekSpecificDayInTimezone(
      5,
      "America/Mexico_City",
    );

    expect(result.numberOfPeople).toBe(6);
    expect(result?.datetime?.start?.time).toBe("20:00:00");
    expect(result?.datetime?.start?.date).toBe(expectedDate);
  });

  test("handles 'el domingo de la semana que viene' correctly", () => {
    const message =
      "Comida familiar para 8 el domingo de la semana que viene a las 2pm";
    const result = parseBookingData(message, "America/Mexico_City");
    const expectedDate = getNextWeekSpecificDayInTimezone(
      0,
      "America/Mexico_City",
    );

    expect(result.numberOfPeople).toBe(8);
    expect(result?.datetime?.start?.time).toBe("14:00:00");
    expect(result?.datetime?.start?.date).toBe(expectedDate);
  });
});
