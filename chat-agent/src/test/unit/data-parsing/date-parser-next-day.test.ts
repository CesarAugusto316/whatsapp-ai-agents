import { parseBookingData } from "@/domain/restaurant/booking";
import { describe, expect, test } from "bun:test";
import {
  getTodayInTimezone,
  getTomorrowInTimezone,
  getDayAfterTomorrowInTimezone,
} from "./date-parser-helpers";

describe("parseBookingData - Next specific day parsing", () => {
  const timezones = [
    "America/Mexico_City",
    "Europe/Madrid",
    "America/Argentina/Buenos_Aires",
    "Asia/Tokyo",
  ];

  // Test "el proximo X dia" (the next specific day)
  for (const tz of timezones) {
    test(`parses 'el proximo viernes' correctly in ${tz}`, () => {
      const message = "Reserva para 2 el proximo viernes a las 7pm";
      const result = parseBookingData(message, tz);

      expect(result.numberOfPeople).toBe(2);
      expect(result?.datetime?.start?.time).toBe("19:00:00");
      expect(result?.datetime?.start?.date).not.toBe("");
    });

    test(`parses 'el próximo lunes' correctly in ${tz}`, () => {
      const message = "Evento para 4 el próximo lunes a las 8pm";
      const result = parseBookingData(message, tz);

      expect(result.numberOfPeople).toBe(4);
      expect(result?.datetime?.start?.time).toBe("20:00:00");
      expect(result?.datetime?.start?.date).not.toBe("");
    });

    test(`parses 'el proximo martes' correctly in ${tz}`, () => {
      const message = "Cita para 3 el proximo martes a las 6pm";
      const result = parseBookingData(message, tz);

      expect(result.numberOfPeople).toBe(3);
      expect(result?.datetime?.start?.time).toBe("18:00:00");
      expect(result?.datetime?.start?.date).not.toBe("");
    });

    test(`parses 'el próximo jueves' correctly in ${tz}`, () => {
      const message = "Reunión para 5 el próximo jueves a las 10am";
      const result = parseBookingData(message, tz);

      expect(result.numberOfPeople).toBe(5);
      expect(result?.datetime?.start?.time).toBe("10:00:00");
      expect(result?.datetime?.start?.date).not.toBe("");
    });
  }

  // Test variations with different accents and forms
  test("handles 'el próximo sábado' correctly", () => {
    const message = "Comida para 6 el próximo sábado a las 1pm";
    const result = parseBookingData(message, "America/Mexico_City");

    expect(result.numberOfPeople).toBe(6);
    expect(result?.datetime?.start?.time).toBe("13:00:00");
    expect(result?.datetime?.start?.date).not.toBe("");
  });

  test("handles 'el proximo domingo' correctly", () => {
    const message = "Celebración para 10 el proximo domingo a las 12pm";
    const result = parseBookingData(message, "America/Mexico_City");

    expect(result.numberOfPeople).toBe(10);
    expect(result?.datetime?.start?.time).toBe("12:00:00");
    expect(result?.datetime?.start?.date).not.toBe("");
  });

  test("handles 'el proximo miércoles' correctly", () => {
    const message = "Entrevista para 1 el proximo miércoles a las 9am";
    const result = parseBookingData(message, "America/Mexico_City");

    expect(result.numberOfPeople).toBe(1);
    expect(result?.datetime?.start?.time).toBe("09:00:00");
    expect(result?.datetime?.start?.date).not.toBe("");
  });
});
