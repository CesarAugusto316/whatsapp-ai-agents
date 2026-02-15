import { parseBookingData } from "@/domain/restaurant/booking";
import { describe, expect, test } from "bun:test";
import {
  getTodayInTimezone,
  getTomorrowInTimezone,
} from "./date-parser-helpers";

describe("parseBookingData - Incomplete Information Handling", () => {
  const timezone = "America/Mexico_City";

  // Example 7 — sin fecha ni hora
  test("handles message with only number of people", () => {
    const message = "Para 2 personas";
    const result = parseBookingData(message, timezone);

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime?.start.date).toBe(""); // como la fecha no fue definida es OK que sea ""
    expect(result.datetime?.start.time).toBe("");
    expect(result.datetime?.end.date).toBe(""); // como la fecha no fue definida es OK que sea ""
    expect(result.datetime?.end.time).toBe("");
  });

  // Example 8 — solo hora
  test("handles message with only time", () => {
    const message = "A las 8pm para 2 personas";
    const result = parseBookingData(message, timezone, new Date(), 60);

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime?.start.date).toBe(""); // como la fecha no fue definida es OK que sea ""
    expect(result.datetime?.start.time).toBe("20:00:00");
    expect(result.datetime?.end.date).toBe(""); // como la fecha no fue definida es OK que sea ""
    expect(result.datetime?.end.time).toBe("21:00:00"); // asume duración promedio
  });

  // Example 9 — solo fecha
  test("handles message with only date", () => {
    const message = "Para mañana para 2 personas";
    const result = parseBookingData(message, timezone);
    const tomorrow = getTomorrowInTimezone(timezone);

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime?.start.date).toBe(tomorrow);
    expect(result.datetime?.start.time).toBe("");
    expect(result.datetime?.end.date).toBe(tomorrow);
    expect(result.datetime?.end.time).toBe("");
  });

  // Caso mixto: nombre + personas, sin fecha/hora
  test("handles message with name and people only", () => {
    const message = "Joao, para 3 personas";
    const result = parseBookingData(message, timezone);

    expect(result.customerName).toBe("Joao");
    expect(result.numberOfPeople).toBe(3);
    expect(result.datetime?.start.date).toBe(""); // como la fecha no fue definida es OK que sea ""
    expect(result.datetime?.start.time).toBe("");
  });

  // Caso: solo confirmación ("sí", "vale")
  test("handles minimal confirmation without data", () => {
    const message = "Sí";
    const result = parseBookingData(message, timezone);

    expect(result.numberOfPeople).toBe(0);
    expect(result.customerName).toBe("");
    expect(result.datetime?.start.date).toBe(""); // como la fecha no fue definida es OK que sea ""
    expect(result.datetime?.start.time).toBe("");
  });

  // Caso: hora sin personas
  test("handles time without explicit number of people", () => {
    const message = "Hoy a las 7pm";
    const result = parseBookingData(message, timezone);

    expect(result.numberOfPeople).toBe(0); // no se menciona
    expect(result.datetime?.start.date).not.toBe("");
    expect(result.datetime?.start.time).toBe("19:00:00");
  });

  // Caso: fecha relativa sin hora ni personas
  test("handles relative date alone", () => {
    const message = "Mañana";
    const result = parseBookingData(message, timezone);

    expect(result.numberOfPeople).toBe(0);
    expect(result.datetime?.start.date).not.toBe("");
    expect(result.datetime?.start.time).toBe("");
  });

  // Caso: rango horario sin fecha
  test("handles time range without date", () => {
    const message = "De 6pm a 10pm para 4 personas";
    const result = parseBookingData(message, timezone);
    expect(result.numberOfPeople).toBe(4);
    expect(result.datetime?.start.date).toBe("");
    expect(result.datetime?.start.time).toBe("18:00:00");
    expect(result.datetime?.end.date).toBe("");
    expect(result.datetime?.end.time).toBe("22:00:00");
  });

  // Caso: fecha explícita sin hora
  test("handles explicit date without time", () => {
    const message = "El 15 de marzo para 2 personas";
    const result = parseBookingData(message, timezone);

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime?.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.datetime?.start.time).toBe("");
  });
});
