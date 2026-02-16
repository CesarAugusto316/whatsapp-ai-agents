import { parseBookingData } from "@/domain/restaurant/booking";
import { describe, expect, test } from "bun:test";
import {
  getTodayInTimezone,
  getTomorrowInTimezone,
  getDayAfterTomorrowInTimezone,
} from "./date-parser-helpers";

describe("parseBookingData - Next month day parsing", () => {
  const timezones = [
    "America/Mexico_City",
    "Europe/Madrid",
    "America/Argentina/Buenos_Aires",
    "Asia/Tokyo",
  ];

  // Test "el martes del mes proximo" (Tuesday of next month)
  for (const tz of timezones) {
    test(`parses 'el martes del mes proximo' correctly in ${tz}`, () => {
      const message = "Reserva para 2 el martes del mes proximo a las 7pm";
      const result = parseBookingData(message, tz);

      expect(result.numberOfPeople).toBe(2);
      expect(result?.datetime?.start?.time).toBe("19:00:00");
      expect(result?.datetime?.start?.date).not.toBe("");
    });

    test(`parses 'el lunes del mes proximo' correctly in ${tz}`, () => {
      const message = "Evento para 4 el lunes del mes proximo a las 8pm";
      const result = parseBookingData(message, tz);

      expect(result.numberOfPeople).toBe(4);
      expect(result?.datetime?.start?.time).toBe("20:00:00");
      expect(result?.datetime?.start?.date).not.toBe("");
    });

    test(`parses 'el viernes del mes siguiente' correctly in ${tz}`, () => {
      const message = "Cita para 3 el viernes del mes siguiente a las 6pm";
      const result = parseBookingData(message, tz);

      expect(result.numberOfPeople).toBe(3);
      expect(result?.datetime?.start?.time).toBe("18:00:00");
      expect(result?.datetime?.start?.date).not.toBe("");
    });

    test(`parses 'el domingo del mes que viene' correctly in ${tz}`, () => {
      const message = "Reunión para 5 el domingo del mes que viene a las 10am";
      const result = parseBookingData(message, tz);

      expect(result.numberOfPeople).toBe(5);
      expect(result?.datetime?.start?.time).toBe("10:00:00");
      expect(result?.datetime?.start?.date).not.toBe("");
    });
  }

  // Test variations with different days
  test("handles 'el miércoles del mes proximo' correctly", () => {
    const message = "Comida para 6 el miércoles del mes proximo a las 1pm";
    const result = parseBookingData(message, "America/Mexico_City");

    expect(result.numberOfPeople).toBe(6);
    expect(result?.datetime?.start?.time).toBe("13:00:00");
    expect(result?.datetime?.start?.date).not.toBe("");
  });

  test("handles 'el jueves del mes que viene' correctly", () => {
    const message = "Celebración para 8 el jueves del mes que viene a las 12pm";
    const result = parseBookingData(message, "America/Mexico_City");

    expect(result.numberOfPeople).toBe(8);
    expect(result?.datetime?.start?.time).toBe("12:00:00");
    expect(result?.datetime?.start?.date).not.toBe("");
  });

  test("handles 'el sábado del mes siguiente' correctly", () => {
    const message = "Fiesta para 12 el sábado del mes siguiente a las 9pm";
    const result = parseBookingData(message, "America/Mexico_City");

    expect(result.numberOfPeople).toBe(12);
    expect(result?.datetime?.start?.time).toBe("21:00:00");
    expect(result?.datetime?.start?.date).not.toBe("");
  });

  test("handles 'el domingo del próximo mes' correctly", () => {
    const message = "Desayuno para 4 el domingo del próximo mes a las 11am";
    const result = parseBookingData(message, "America/Mexico_City");

    expect(result.numberOfPeople).toBe(4);
    expect(result?.datetime?.start?.time).toBe("11:00:00");
    expect(result?.datetime?.start?.date).not.toBe("");
  });
});
