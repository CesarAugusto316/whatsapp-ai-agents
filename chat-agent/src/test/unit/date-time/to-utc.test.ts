import { toUTC } from "@/domain/utilities";
import { describe, expect, test } from "bun:test";

describe("to UTC", () => {
  describe("Europa - con horario de verano/invierno", () => {
    test("Madrid - invierno (UTC+1)", () => {
      const result = toUTC(
        { date: "2026-01-26", time: "18:00:00" },
        "Europe/Madrid",
      );
      expect(result).toBe("2026-01-26T17:00:00.000Z");
    });

    test("Madrid - verano (UTC+2)", () => {
      const result = toUTC(
        { date: "2026-07-26", time: "18:00:00" },
        "Europe/Madrid",
      );
      expect(result).toBe("2026-07-26T16:00:00.000Z");
    });

    test("Berlín/Alemania - invierno (UTC+1)", () => {
      const result = toUTC(
        { date: "2026-01-26", time: "18:00:00" },
        "Europe/Berlin",
      );
      expect(result).toBe("2026-01-26T17:00:00.000Z");
    });

    test("Berlín/Alemania - verano (UTC+2)", () => {
      const result = toUTC(
        { date: "2026-07-26", time: "18:00:00" },
        "Europe/Berlin",
      );
      expect(result).toBe("2026-07-26T16:00:00.000Z");
    });

    test("Londres - invierno (UTC+0)", () => {
      const result = toUTC(
        { date: "2026-01-26", time: "18:00:00" },
        "Europe/London",
      );
      expect(result).toBe("2026-01-26T18:00:00.000Z");
    });

    test("Londres - verano (UTC+1)", () => {
      const result = toUTC(
        { date: "2026-07-26", time: "18:00:00" },
        "Europe/London",
      );
      expect(result).toBe("2026-07-26T17:00:00.000Z");
    });
  });

  describe("América Latina - sin horario de verano", () => {
    test("Ecuador (Guayaquil) - UTC-5 todo el año", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "15:00:00" },
        "America/Guayaquil",
      );
      expect(result).toBe("2026-01-02T20:00:00.000Z");
    });

    test("Colombia (Bogotá) - UTC-5 todo el año", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "15:00:00" },
        "America/Bogota",
      );
      expect(result).toBe("2026-01-02T20:00:00.000Z");
    });

    test("Perú (Lima) - UTC-5 todo el año", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "15:00:00" },
        "America/Lima",
      );
      expect(result).toBe("2026-01-02T20:00:00.000Z");
    });

    test("Chile (Santiago) - con horario de verano", () => {
      // Chile puede tener horario de verano, verano UTC-3, invierno UTC-4
      const resultInvierno = toUTC(
        { date: "2026-01-02", time: "15:00:00" },
        "America/Santiago",
      );
      expect(resultInvierno).toBe("2026-01-02T18:00:00.000Z"); // UTC-4 en enero

      const resultVerano = toUTC(
        { date: "2026-12-02", time: "15:00:00" },
        "America/Santiago",
      );
      expect(resultVerano).toBe("2026-12-02T18:00:00.000Z"); // UTC-3 en diciembre
    });
  });

  describe("Norteamérica - con horario de verano", () => {
    test("México (Ciudad de México) - invierno UTC-6", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "15:00:00" },
        "America/Mexico_City",
      );
      expect(result).toBe("2026-01-02T21:00:00.000Z");
    });

    test("USA (Nueva York) - invierno UTC-5", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "15:00:00" },
        "America/New_York",
      );
      expect(result).toBe("2026-01-02T20:00:00.000Z");
    });

    test("USA (Nueva York) - verano UTC-4", () => {
      const result = toUTC(
        { date: "2026-07-02", time: "15:00:00" },
        "America/New_York",
      );
      expect(result).toBe("2026-07-02T19:00:00.000Z");
    });

    test("USA (Los Ángeles) - invierno UTC-8", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "15:00:00" },
        "America/Los_Angeles",
      );
      expect(result).toBe("2026-01-02T23:00:00.000Z");
    });

    test("USA (Los Ángeles) - verano UTC-7", () => {
      const result = toUTC(
        { date: "2026-07-02", time: "15:00:00" },
        "America/Los_Angeles",
      );
      expect(result).toBe("2026-07-02T22:00:00.000Z");
    });
  });

  describe("Casos especiales y bordes", () => {
    test("Medianoche local", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "00:00:00" },
        "Europe/Madrid",
      );
      expect(result).toBe("2026-01-01T23:00:00.000Z");
    });

    test("Casi medianoche (23:59:59)", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "23:59:59" },
        "Europe/Madrid",
      );
      expect(result).toBe("2026-01-02T22:59:59.000Z");
    });

    test("Día del cambio de horario (verano → invierno)", () => {
      // En Madrid, el último domingo de octubre cambia de UTC+2 a UTC+1
      // 2026-10-25 02:00 → 2026-10-25 01:00 (se repite la hora)
      const result1 = toUTC(
        { date: "2026-10-25", time: "01:30:00" },
        "Europe/Madrid",
      );
      // Este es ambiguo - date-fns-tz debería manejar la primera ocurrencia
      expect(result1).toBe("2026-10-24T23:30:00.000Z");

      const result2 = toUTC(
        { date: "2026-10-25", time: "02:30:00" },
        "Europe/Madrid",
      );
      // Después del cambio
      expect(result2).toBe("2026-10-25T01:30:00.000Z");
    });

    test("UTC como zona horaria", () => {
      const result = toUTC({ date: "2026-01-02", time: "15:00:00" }, "UTC");
      expect(result).toBe("2026-01-02T15:00:00.000Z");
    });

    test("Zona horaria con offset numérico", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "15:00:00" },
        "+05:30", // India
      );
      expect(result).toBe("2026-01-02T09:30:00.000Z");
    });
  });

  describe("Formatos de hora flexibles", () => {
    test("Hora sin segundos", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "15:00" },
        "Europe/Madrid",
      );
      expect(result).toBe("2026-01-02T14:00:00.000Z");
    });

    test("Hora con minutos y segundos", () => {
      const result = toUTC(
        { date: "2026-01-02", time: "15:30:45" },
        "Europe/Madrid",
      );
      expect(result).toBe("2026-01-02T14:30:45.000Z");
    });
  });

  // Test de diagnóstico para entender cómo date-fns-tz maneja horas ambiguas
  describe("Comportamiento de fromZonedTime con horas ambiguas", () => {
    test("Horas no existentes (spring forward)", () => {
      const { fromZonedTime } = require("date-fns-tz");

      // Hora que no existe: 2026-03-29 02:30 en Madrid
      const result = fromZonedTime("2026-03-29T02:30:00", "Europe/Madrid");

      console.log("Hora no existente result:", result.toISOString());
      console.log("Hora no existente UTC:", result.getTime());

      // fromZonedTime avanza la hora al siguiente offset válido
      expect(result.toISOString()).toBe("2026-03-29T00:30:00.000Z");
    });

    test("Horas ambiguas (fall back)", () => {
      const { fromZonedTime } = require("date-fns-tz");

      // Hora ambigua: 2026-10-25 01:30 en Madrid (ocurre dos veces)
      const result = fromZonedTime("2026-10-25T01:30:00", "Europe/Madrid");

      console.log("Hora ambigua result:", result.toISOString());
      // Por defecto, usa la primera ocurrencia (horario de verano)
      expect(result.toISOString()).toBe("2026-10-24T23:30:00.000Z");
    });
  });
});
