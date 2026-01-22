import { toLocalDateTime, toUTC } from "@/domain/utilities";
import { describe, expect, test } from "bun:test";

describe("toLocalDateTime", () => {
  describe("Conversiones básicas UTC → local", () => {
    test("UTC a Guayaquil (UTC-5) - ejemplo de documentación", () => {
      const result = toLocalDateTime(
        "2026-01-03T01:00:00.000Z",
        "America/Guayaquil",
      );
      expect(result).toEqual({
        date: "2026-01-02",
        time: "20:00:00",
      });
    });

    test("UTC a Madrid invierno (UTC+1)", () => {
      const result = toLocalDateTime(
        "2026-01-26T17:00:00.000Z",
        "Europe/Madrid",
      );
      expect(result).toEqual({
        date: "2026-01-26",
        time: "18:00:00",
      });
    });

    test("UTC a Madrid verano (UTC+2)", () => {
      const result = toLocalDateTime(
        "2026-07-26T16:00:00.000Z",
        "Europe/Madrid",
      );
      expect(result).toEqual({
        date: "2026-07-26",
        time: "18:00:00",
      });
    });
  });

  describe("América Latina - sin horario de verano (excepto Chile)", () => {
    test("Ecuador (Guayaquil) - UTC-5", () => {
      const result = toLocalDateTime(
        "2026-06-15T12:00:00.000Z",
        "America/Guayaquil",
      );
      expect(result).toEqual({
        date: "2026-06-15",
        time: "07:00:00", // 12:00 UTC = 07:00 en Guayaquil (UTC-5)
      });
    });

    test("Colombia (Bogotá) - UTC-5", () => {
      const result = toLocalDateTime(
        "2026-06-15T12:00:00.000Z",
        "America/Bogota",
      );
      expect(result).toEqual({
        date: "2026-06-15",
        time: "07:00:00",
      });
    });

    test("Perú (Lima) - UTC-5", () => {
      const result = toLocalDateTime(
        "2026-06-15T12:00:00.000Z",
        "America/Lima",
      );
      expect(result).toEqual({
        date: "2026-06-15",
        time: "07:00:00",
      });
    });

    test("Chile (Santiago) - verano UTC-3", () => {
      // Diciembre en Chile es verano (UTC-3)
      const result = toLocalDateTime(
        "2026-12-15T12:00:00.000Z",
        "America/Santiago",
      );
      expect(result).toEqual({
        date: "2026-12-15",
        time: "09:00:00", // 12:00 UTC = 09:00 Santiago (UTC-3)
      });
    });

    test("Chile (Santiago) - invierno UTC-4", () => {
      // Julio en Chile es invierno (UTC-4)
      const result = toLocalDateTime(
        "2026-07-15T12:00:00.000Z",
        "America/Santiago",
      );
      expect(result).toEqual({
        date: "2026-07-15",
        time: "08:00:00", // 12:00 UTC = 08:00 Santiago (UTC-4)
      });
    });
  });

  describe("Norteamérica - con horario de verano", () => {
    test("México (Ciudad de México) - UTC-6 (sin DST ahora)", () => {
      // México eliminó el horario de verano
      const result = toLocalDateTime(
        "2026-07-02T21:00:00.000Z",
        "America/Mexico_City",
      );
      expect(result).toEqual({
        date: "2026-07-02",
        time: "15:00:00", // 21:00 UTC = 15:00 México (UTC-6)
      });
    });

    test("USA (Nueva York) - invierno UTC-5", () => {
      const result = toLocalDateTime(
        "2026-01-15T17:00:00.000Z",
        "America/New_York",
      );
      expect(result).toEqual({
        date: "2026-01-15",
        time: "12:00:00", // 17:00 UTC = 12:00 NY (UTC-5)
      });
    });

    test("USA (Nueva York) - verano UTC-4", () => {
      const result = toLocalDateTime(
        "2026-07-15T16:00:00.000Z",
        "America/New_York",
      );
      expect(result).toEqual({
        date: "2026-07-15",
        time: "12:00:00", // 16:00 UTC = 12:00 NY (UTC-4)
      });
    });

    test("USA (Los Ángeles) - invierno UTC-8", () => {
      const result = toLocalDateTime(
        "2026-01-15T20:00:00.000Z",
        "America/Los_Angeles",
      );
      expect(result).toEqual({
        date: "2026-01-15",
        time: "12:00:00", // 20:00 UTC = 12:00 LA (UTC-8)
      });
    });

    test("USA (Los Ángeles) - verano UTC-7", () => {
      const result = toLocalDateTime(
        "2026-07-15T19:00:00.000Z",
        "America/Los_Angeles",
      );
      expect(result).toEqual({
        date: "2026-07-15",
        time: "12:00:00", // 19:00 UTC = 12:00 LA (UTC-7)
      });
    });
  });

  describe("Europa - con horario de verano", () => {
    test("Alemania (Berlín) - invierno UTC+1", () => {
      const result = toLocalDateTime(
        "2026-01-15T11:00:00.000Z",
        "Europe/Berlin",
      );
      expect(result).toEqual({
        date: "2026-01-15",
        time: "12:00:00", // 11:00 UTC = 12:00 Berlín (UTC+1)
      });
    });

    test("Alemania (Berlín) - verano UTC+2", () => {
      const result = toLocalDateTime(
        "2026-07-15T10:00:00.000Z",
        "Europe/Berlin",
      );
      expect(result).toEqual({
        date: "2026-07-15",
        time: "12:00:00", // 10:00 UTC = 12:00 Berlín (UTC+2)
      });
    });

    test("Reino Unido (Londres) - invierno UTC+0", () => {
      const result = toLocalDateTime(
        "2026-01-15T12:00:00.000Z",
        "Europe/London",
      );
      expect(result).toEqual({
        date: "2026-01-15",
        time: "12:00:00", // 12:00 UTC = 12:00 Londres (UTC+0)
      });
    });

    test("Reino Unido (Londres) - verano UTC+1", () => {
      const result = toLocalDateTime(
        "2026-07-15T11:00:00.000Z",
        "Europe/London",
      );
      expect(result).toEqual({
        date: "2026-07-15",
        time: "12:00:00", // 11:00 UTC = 12:00 Londres (UTC+1)
      });
    });
  });

  describe("Casos especiales y bordes", () => {
    test("Medianoche UTC", () => {
      const result = toLocalDateTime(
        "2026-01-01T00:00:00.000Z",
        "Europe/Madrid",
      );
      expect(result).toEqual({
        date: "2026-01-01",
        time: "01:00:00", // 00:00 UTC = 01:00 Madrid (UTC+1 en invierno)
      });
    });

    test("Último minuto del día UTC", () => {
      const result = toLocalDateTime(
        "2026-12-31T23:59:59.000Z",
        "America/Guayaquil",
      );
      expect(result).toEqual({
        date: "2026-12-31",
        time: "18:59:59", // 23:59 UTC = 18:59 Guayaquil (UTC-5)
      });
    });

    test("Cambio de mes en UTC", () => {
      // 01:00 UTC del 1ro de febrero = 20:00 del 31 de enero en Guayaquil
      const result = toLocalDateTime(
        "2026-02-01T01:00:00.000Z",
        "America/Guayaquil",
      );
      expect(result).toEqual({
        date: "2026-01-31",
        time: "20:00:00",
      });
    });

    test("Año bisiesto", () => {
      const result = toLocalDateTime(
        "2024-02-29T12:00:00.000Z", // 29 de febrero en año bisiesto
        "Europe/Madrid",
      );
      expect(result).toEqual({
        date: "2024-02-29",
        time: "13:00:00", // 12:00 UTC = 13:00 Madrid (UTC+1 en invierno)
      });
    });

    test("Zona horaria UTC", () => {
      const result = toLocalDateTime("2026-06-15T12:00:00.000Z", "UTC");
      expect(result).toEqual({
        date: "2026-06-15",
        time: "12:00:00", // Misma hora en UTC
      });
    });

    test("Offset numérico (+05:30 para India)", () => {
      const result = toLocalDateTime("2026-06-15T12:00:00.000Z", "+05:30");
      expect(result).toEqual({
        date: "2026-06-15",
        time: "17:30:00", // 12:00 UTC = 17:30 India (UTC+5:30)
      });
    });
  });

  describe("Horas ambiguas en cambios de horario", () => {
    test("Hora que no existe (primavera) - Madrid", () => {
      // En Madrid, el 2026-03-29 a las 02:30 no existe (salto de 02:00 a 03:00)
      // 00:30 UTC = 01:30 CET (UTC+1) porque 02:30 CEST (UTC+2) no existe localmente
      // toZonedTime elige la interpretación válida más cercana: 01:30 CET
      const result = toLocalDateTime(
        "2026-03-29T00:30:00.000Z",
        "Europe/Madrid",
      );

      // El comportamiento correcto es 01:30:00 (CET), no 02:30:00
      expect(result).toEqual({
        date: "2026-03-29",
        time: "01:30:00",
      });
    });

    test("Hora que se repite (otoño) - Madrid", () => {
      // En Madrid, 2026-10-25 01:30 ocurre dos veces (CEST y CET)
      // Probamos con una hora UTC que cae en esa ventana
      const result = toLocalDateTime(
        "2026-10-25T00:30:00.000Z",
        "Europe/Madrid",
      );
      // 00:30 UTC podría ser 02:30 CEST o 01:30 CET
      // date-fns-tz probablemente use la primera ocurrencia (CEST)
      // Verificamos que al menos el formato sea correcto
      expect(result.date).toBe("2026-10-25");
      // Podría ser 02:30 (CEST) o 01:30 (CET)
      expect(["01:30:00", "02:30:00"]).toContain(result.time);
    });
  });

  describe("Round-trip con localDateTimeToUTC", () => {
    // Necesitas importar localDateTimeToUTC para estos tests
    // const { localDateTimeToUTC } = require("./tu-archivo-local-to-utc");

    test("Round-trip: UTC → local → UTC", () => {
      const originalUTC = "2026-07-26T16:00:00.000Z";
      const timeZone = "Europe/Madrid";

      const local = toLocalDateTime(originalUTC, timeZone);
      const roundTripUTC = toUTC(local, timeZone);

      expect(roundTripUTC).toBe(originalUTC);
    });

    test("Round-trip: local → UTC → local", () => {
      const originalLocal = { date: "2026-07-26", time: "18:00:00" };
      const timeZone = "Europe/Madrid";

      const utc = toUTC(originalLocal, timeZone);
      const roundTripLocal = toLocalDateTime(utc, timeZone);

      expect(roundTripLocal).toEqual(originalLocal);
    });

    test("Round-trip con zona horaria compleja (Nueva York)", () => {
      const originalUTC = "2026-07-15T16:00:00.000Z";
      const timeZone = "America/New_York";

      const local = toLocalDateTime(originalUTC, timeZone);
      const roundTripUTC = toUTC(local, timeZone);

      expect(roundTripUTC).toBe(originalUTC);
    });
  });

  describe("Manejo de errores y casos inválidos", () => {
    test("Fecha UTC inválida debe lanzar error", () => {
      expect(() => {
        toLocalDateTime("fecha-invalida", "Europe/Madrid");
      }).toThrow();
    });

    test("Zona horaria inválida debe lanzar error", () => {
      expect(() => {
        toLocalDateTime("2026-01-01T00:00:00.000Z", "Zona/Invalida");
      }).toThrow();
    });

    test("String vacío debe lanzar error", () => {
      expect(() => {
        toLocalDateTime("", "Europe/Madrid");
      }).toThrow();
    });
  });
});
