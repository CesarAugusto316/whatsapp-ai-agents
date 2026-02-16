import { parseBookingData } from "@/domain/restaurant/booking";
import { describe, expect, test } from "bun:test";
import {
  getTodayInTimezone,
  getTomorrowInTimezone,
  getDayAfterTomorrowInTimezone,
} from "./date-parser-helpers";

describe("parseBookingData - Week-relative date parsing", () => {
  const timezones = [
    "America/Mexico_City",
    "Europe/Madrid",
    "America/Argentina/Buenos_Aires",
    "Asia/Tokyo",
  ];

  // Test "la semana que viene X dia" (the upcoming week X day)
  for (const tz of timezones) {
    test(`parses 'la semana que viene X dia' correctly in ${tz}`, () => {
      const daysOfWeek = [
        { spanish: "lunes", english: "Monday" },
        { spanish: "martes", english: "Tuesday" },
        { spanish: "miércoles", english: "Wednesday" },
        { spanish: "jueves", english: "Thursday" },
        { spanish: "viernes", english: "Friday" },
        { spanish: "sábado", english: "Saturday" },
        { spanish: "domingo", english: "Sunday" },
      ];

      for (const day of daysOfWeek) {
        const message = `Reserva para 2 la semana que viene ${day.spanish} a las 7pm`;
        const result = parseBookingData(message, tz);

        // The date should be the next occurrence of the specified day in the following week
        expect(result.numberOfPeople).toBe(2);
        expect(result?.datetime?.start?.time).toBe("19:00:00");
        expect(result?.datetime?.start?.date).not.toBe("");
      }
    });

    test(`parses 'la próxima semana X dia' correctly in ${tz}`, () => {
      const daysOfWeek = [
        { spanish: "lunes", english: "Monday" },
        { spanish: "martes", english: "Tuesday" },
        { spanish: "miércoles", english: "Wednesday" },
        { spanish: "jueves", english: "Thursday" },
        { spanish: "viernes", english: "Friday" },
        { spanish: "sábado", english: "Saturday" },
        { spanish: "domingo", english: "Sunday" },
      ];

      for (const day of daysOfWeek) {
        const message = `Evento para 4 la próxima semana ${day.spanish} a las 8pm`;
        const result = parseBookingData(message, tz);

        expect(result.numberOfPeople).toBe(4);
        expect(result?.datetime?.start?.time).toBe("20:00:00");
        expect(result?.datetime?.start?.date).not.toBe("");
      }
    });

    test(`parses 'el proximo X dia' correctly in ${tz}`, () => {
      const daysOfWeek = [
        { spanish: "lunes", english: "Monday" },
        { spanish: "martes", english: "Tuesday" },
        { spanish: "miércoles", english: "Wednesday" },
        { spanish: "jueves", english: "Thursday" },
        { spanish: "viernes", english: "Friday" },
        { spanish: "sábado", english: "Saturday" },
        { spanish: "domingo", english: "Sunday" },
      ];

      for (const day of daysOfWeek) {
        const message = `Cita para 3 el próximo ${day.spanish} a las 6pm`;
        const result = parseBookingData(message, tz);

        expect(result.numberOfPeople).toBe(3);
        expect(result?.datetime?.start?.time).toBe("18:00:00");
        expect(result?.datetime?.start?.date).not.toBe("");
      }
    });

    test(`parses 'el proximo X dia' with accent correctly in ${tz}`, () => {
      const daysOfWeek = [
        { spanish: "lunes", english: "Monday" },
        { spanish: "martes", english: "Tuesday" },
        { spanish: "miércoles", english: "Wednesday" },
        { spanish: "jueves", english: "Thursday" },
        { spanish: "viernes", english: "Friday" },
        { spanish: "sábado", english: "Saturday" },
        { spanish: "domingo", english: "Sunday" },
      ];

      for (const day of daysOfWeek) {
        const message = `Reunión para 5 el próximo ${day.spanish} a las 10am`;
        const result = parseBookingData(message, tz);

        expect(result.numberOfPeople).toBe(5);
        expect(result?.datetime?.start?.time).toBe("10:00:00");
        expect(result?.datetime?.start?.date).not.toBe("");
      }
    });
  }

  // Test specific scenarios
  test("handles 'el martes de la semana que viene' correctly", () => {
    const message = "Reserva para 2 el martes de la semana que viene a las 7pm";
    const result = parseBookingData(message, "America/Mexico_City");

    expect(result.numberOfPeople).toBe(2);
    expect(result?.datetime?.start?.time).toBe("19:00:00");
    expect(result?.datetime?.start?.date).not.toBe("");
  });

  test("handles 'el viernes de la próxima semana' correctly", () => {
    const message = "Evento para 6 el viernes de la próxima semana a las 8pm";
    const result = parseBookingData(message, "America/Mexico_City");

    expect(result.numberOfPeople).toBe(6);
    expect(result?.datetime?.start?.time).toBe("20:00:00");
    expect(result?.datetime?.start?.date).not.toBe("");
  });

  test("handles 'el domingo de la semana que viene' correctly", () => {
    const message = "Comida familiar para 8 el domingo de la semana que viene a las 2pm";
    const result = parseBookingData(message, "America/Mexico_City");

    expect(result.numberOfPeople).toBe(8);
    expect(result?.datetime?.start?.time).toBe("14:00:00");
    expect(result?.datetime?.start?.date).not.toBe("");
  });
});
