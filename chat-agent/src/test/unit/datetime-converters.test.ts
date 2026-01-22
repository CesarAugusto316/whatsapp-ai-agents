import { localDateTimeToUTC, utcToLocalDateTime } from "@/domain/utilities";
import { describe, expect, test, mock } from "bun:test";

describe("localDateTimeToUTC", () => {
  // Caso básico del ejemplo
  test("convierte fecha/hora de Guayaquil a UTC correctamente", () => {
    const result = localDateTimeToUTC(
      { date: "2026-01-02", time: "20:00:00" },
      "America/Guayaquil",
    );
    expect(result).toBe("2026-01-03T01:00:00.000Z");
  });

  // Diferentes zonas horarias
  test("convierte de Madrid a UTC (invierno)", () => {
    const result = localDateTimeToUTC(
      { date: "2026-01-02", time: "15:00:00" },
      "Europe/Madrid",
    );
    expect(result).toBe("2026-01-02T14:00:00.000Z"); // CET = UTC+1 en invierno
  });

  test("convierte de Tokio a UTC", () => {
    const result = localDateTimeToUTC(
      { date: "2026-01-02", time: "09:00:00" },
      "Asia/Tokyo",
    );
    expect(result).toBe("2026-01-02T00:00:00.000Z"); // JST = UTC+9
  });

  // Caso horario de verano (EDT)
  test("maneja horario de verano (New York)", () => {
    const result = localDateTimeToUTC(
      { date: "2026-07-02", time: "14:00:00" },
      "America/New_York",
    );
    expect(result).toBe("2026-07-02T18:00:00.000Z"); // EDT = UTC-4
  });

  // Caso horario de invierno (EST)
  test("maneja horario estándar (New York)", () => {
    const result = localDateTimeToUTC(
      { date: "2026-01-02", time: "14:00:00" },
      "America/New_York",
    );
    expect(result).toBe("2026-01-02T19:00:00.000Z"); // EST = UTC-5
  });

  // Caso UTC como entrada (debería permanecer igual)
  test("maneja zona horaria UTC", () => {
    const result = localDateTimeToUTC(
      { date: "2026-01-02", time: "12:00:00" },
      "UTC",
    );
    expect(result).toBe("2026-01-02T12:00:00.000Z");
  });

  // Caso medianoche
  test("maneja medianoche con cambio de día", () => {
    const result = localDateTimeToUTC(
      { date: "2026-01-02", time: "00:00:00" },
      "America/Guayaquil",
    );
    expect(result).toBe("2026-01-02T05:00:00.000Z"); // GMT-5
  });

  // Validar formato de salida
  test("siempre retorna formato ISO con Z", () => {
    const result = localDateTimeToUTC(
      { date: "2026-01-02", time: "12:00:00" },
      "America/Guayaquil",
    );
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe("utcToLocalDateTime", () => {
  // Caso básico del ejemplo
  test("convierte UTC a fecha/hora de Guayaquil correctamente", () => {
    const result = utcToLocalDateTime(
      "2026-01-03T01:00:00.000Z",
      "America/Guayaquil",
    );
    expect(result).toEqual({ date: "2026-01-02", time: "20:00:00" });
  });

  // Diferentes zonas horarias
  test("convierte UTC a Madrid (invierno)", () => {
    const result = utcToLocalDateTime(
      "2026-01-02T14:00:00.000Z",
      "Europe/Madrid",
    );
    expect(result).toEqual({ date: "2026-01-02", time: "15:00:00" });
  });

  test("convierte UTC a Tokio", () => {
    const result = utcToLocalDateTime("2026-01-02T00:00:00.000Z", "Asia/Tokyo");
    expect(result).toEqual({ date: "2026-01-02", time: "09:00:00" });
  });

  // Horario de verano (EDT)
  test("maneja horario de verano al convertir (New York)", () => {
    const result = utcToLocalDateTime(
      "2026-07-02T18:00:00.000Z",
      "America/New_York",
    );
    expect(result).toEqual({ date: "2026-07-02", time: "14:00:00" });
  });

  // Horario estándar (EST)
  test("maneja horario estándar al convertir (New York)", () => {
    const result = utcToLocalDateTime(
      "2026-01-02T19:00:00.000Z",
      "America/New_York",
    );
    expect(result).toEqual({ date: "2026-01-02", time: "14:00:00" });
  });

  // Caso UTC como entrada
  test("maneja zona horaria UTC", () => {
    const result = utcToLocalDateTime("2026-01-02T12:00:00.000Z", "UTC");
    expect(result).toEqual({ date: "2026-01-02", time: "12:00:00" });
  });

  // Caso con milisegundos en ISO
  test("maneja ISO string con milisegundos", () => {
    const result = utcToLocalDateTime(
      "2026-01-03T01:00:00.123Z",
      "America/Guayaquil",
    );
    expect(result).toEqual({ date: "2026-01-02", time: "20:00:00" });
  });

  // Validar formato de retorno
  test("siempre retorna formato YYYY-MM-DD y HH:MM:SS", () => {
    const result = utcToLocalDateTime(
      "2026-01-03T01:00:00.000Z",
      "America/Guayaquil",
    );
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});

// Tests de integración - Round trip
describe("Round trip conversions", () => {
  test("UTC → local → UTC mantiene igual", () => {
    const originalUTC = "2026-01-03T01:00:00.000Z";
    const local = utcToLocalDateTime(originalUTC, "America/Guayaquil");
    const backToUTC = localDateTimeToUTC(local, "America/Guayaquil");

    expect(backToUTC).toBe(originalUTC);
  });

  test("local → UTC → local mantiene igual", () => {
    const originalLocal = { date: "2026-01-02", time: "20:00:00" };
    const utc = localDateTimeToUTC(originalLocal, "America/Guayaquil");
    const backToLocal = utcToLocalDateTime(utc, "America/Guayaquil");

    expect(backToLocal).toEqual(originalLocal);
  });

  test("funciona con diferentes zonas horarias en round trip", () => {
    const originalLocal = { date: "2026-07-02", time: "14:00:00" };
    const utc = localDateTimeToUTC(originalLocal, "America/New_York");
    const backToLocal = utcToLocalDateTime(utc, "America/New_York");

    expect(backToLocal).toEqual(originalLocal);
  });
});

// Tests de manejo de errores (simulados)
describe("Manejo de casos extremos", () => {
  test("maneja zona horaria inválida en localDateTimeToUTC", () => {
    expect(() => {
      localDateTimeToUTC(
        { date: "2026-01-02", time: "12:00:00" },
        "Zona/Invalida",
      );
    }).toThrow(RangeError);
  });

  test("formato de fecha inválido en localDateTimeToUTC", () => {
    expect(() => {
      localDateTimeToUTC({ date: "fecha-invalida", time: "12:00:00" }, "UTC");
    }).toThrow(RangeError);
  });
});

// ADDITIONAL TESTS
describe("Casos adicionales para localDateTimeToUTC", () => {
  test("maneja cambio de horario de verano en zona con DST", () => {
    // En América/New_York, el 2026-03-08 02:00:00 no existe (salto hacia adelante)
    // Pero nuestra función no debería tener problemas porque la entrada es una fecha local.
    // Solo estamos convirtiendo una fecha local asumida en esa zona a UTC.
    // Este test es para ver que no se produzcan errores.
    const result = localDateTimeToUTC(
      { date: "2026-03-08", time: "02:00:00" },
      "America/New_York",
    );
    // No hay un valor específico esperado, solo que no lance error y devuelva un string en formato ISO.
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test("maneja el último minuto del año", () => {
    const result = localDateTimeToUTC(
      { date: "2026-12-31", time: "23:59:59" },
      "America/Guayaquil",
    );
    // Solo verificamos que la conversión sea consistente con la zona horaria.
    // Podemos hacer un round trip.
    const local = utcToLocalDateTime(result, "America/Guayaquil");
    expect(local).toEqual({ date: "2026-12-31", time: "23:59:59" });
  });
});

describe("Casos adicionales para utcToLocalDateTime", () => {
  test("maneja UTC en el cambio de día (medianoche UTC)", () => {
    const result = utcToLocalDateTime(
      "2026-01-02T00:00:00.000Z",
      "America/Guayaquil",
    );
    // 00:00 UTC es 19:00 del día anterior en Guayaquil (GMT-5)
    expect(result).toEqual({ date: "2026-01-01", time: "19:00:00" });
  });

  test("maneja fecha en el límite de los meses (fin de mes)", () => {
    const result = utcToLocalDateTime("2026-01-31T23:59:59.999Z", "Asia/Tokyo");
    // Tokio está 9 horas por delante, así que será el 1 de febrero.
    expect(result).toEqual({ date: "2026-02-01", time: "08:59:59" });
  });
});
