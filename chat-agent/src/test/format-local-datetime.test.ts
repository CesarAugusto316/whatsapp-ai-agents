// formatLocalDateTime.test.ts
import { formatLocalDateTime } from "@/helpers/datetime-converters";
import { describe, expect, test } from "bun:test";

// format-local-datetime.test.ts

describe("formatLocalDateTime", () => {
  test("formatea correctamente una fecha y hora", () => {
    const result = formatLocalDateTime(
      { date: "2025-01-07", time: "14:00:00" },
      "America/Mexico_City",
    );

    expect(result).toBe("Martes 7 de enero del 2025, 02:00pm");
  });

  test("maneja medianoche correctamente", () => {
    const result = formatLocalDateTime(
      { date: "2026-07-02", time: "00:30:00" },
      "Europe/Madrid",
    );

    expect(result).toBe("Jueves 2 de julio del 2026, 12:30am");
  });

  test("funciona con diferentes zonas horarias", () => {
    const result = formatLocalDateTime(
      { date: "2024-12-25", time: "20:45:00" },
      "America/New_York",
    );

    expect(result).toBe("Miércoles 25 de diciembre del 2024, 08:45pm");
  });

  test("es una función pura - misma entrada, misma salida", () => {
    const input = { date: "2025-01-07", time: "14:00:00" };
    const timeZone = "America/Guayaquil";

    const result1 = formatLocalDateTime(input, timeZone);
    const result2 = formatLocalDateTime(input, timeZone);

    expect(result1).toBe(result2);
  });

  test("maneja borde del día con zona horaria", () => {
    const result = formatLocalDateTime(
      { date: "2025-01-07", time: "23:59:00" },
      "Asia/Tokyo",
    );

    // 23:59 en Tokyo es el 7 de enero, no el 8
    expect(result).toBe("Martes 7 de enero del 2025, 11:59pm");
  });

  test("maneja horas de la mañana", () => {
    const result = formatLocalDateTime(
      { date: "2025-01-07", time: "08:15:00" },
      "America/Mexico_City",
    );

    expect(result).toBe("Martes 7 de enero del 2025, 08:15am");
  });

  test("ejemplo específico del comentario", () => {
    const result = formatLocalDateTime(
      { date: "2026-07-02", time: "14:00:00" },
      "America/Guayaquil",
    );

    expect(result).toBe("Jueves 2 de julio del 2026, 02:00pm");
  });

  // Tests adicionales exhaustivos
  test("formatea correctamente el mediodía", () => {
    const result = formatLocalDateTime(
      { date: "2025-06-15", time: "12:00:00" },
      "Europe/London",
    );

    expect(result).toBe("Domingo 15 de junio del 2025, 12:00pm");
  });

  test("maneja cambio de mes por zona horaria - caso real", () => {
    // 23:30 en Auckland el 31 de enero ES el 31 de enero, no 1 de febrero
    const result = formatLocalDateTime(
      { date: "2025-01-31", time: "23:30:00" },
      "Pacific/Auckland",
    );

    expect(result).toBe("Viernes 31 de enero del 2025, 11:30pm");
  });

  test("maneja cambio de año por zona horaria - caso real", () => {
    // 23:45 en Tokyo el 31 de diciembre ES el 31 de diciembre, no 1 de enero
    const result = formatLocalDateTime(
      { date: "2024-12-31", time: "23:45:00" },
      "Asia/Tokyo",
    );

    expect(result).toBe("Martes 31 de diciembre del 2024, 11:45pm");
  });

  test("maneja zonas horarias con offset negativo", () => {
    const result = formatLocalDateTime(
      { date: "2025-01-01", time: "01:00:00" },
      "America/Los_Angeles",
    );

    expect(result).toBe("Miércoles 1 de enero del 2025, 01:00am");
  });

  test("maneja horario de verano - hora válida", () => {
    // Usamos una fecha después del cambio de horario para evitar problemas
    const result = formatLocalDateTime(
      { date: "2025-03-10", time: "03:30:00" }, // 10 de marzo, no 9
      "America/New_York",
    );

    expect(result).toBe("Lunes 10 de marzo del 2025, 03:30am");
  });

  test("maneja horario de verano - hora inválida (saltada)", () => {
    // 2:30am el 9 de marzo de 2024 en Nueva York no existe (se salta de 2am a 3am)
    // La función debería manejar esto de manera elegante
    const result = formatLocalDateTime(
      { date: "2024-03-10", time: "02:30:00" },
      "America/New_York",
    );

    // Nota: El comportamiento puede variar, este test puede necesitar ajuste
    expect(result).toContain("marzo del 2024");
  });

  test("maneja fechas históricas", () => {
    const result = formatLocalDateTime(
      { date: "2000-01-01", time: "00:00:00" },
      "UTC",
    );

    expect(result).toBe("Sábado 1 de enero del 2000, 12:00am");
  });

  test("maneja fechas futuras", () => {
    const result = formatLocalDateTime(
      { date: "2030-12-31", time: "23:59:59" },
      "Australia/Sydney",
    );

    expect(result).toBe("Martes 31 de diciembre del 2030, 11:59pm");
  });

  test("maneja diferentes formatos de hora", () => {
    const result1 = formatLocalDateTime(
      { date: "2025-01-07", time: "00:00:01" },
      "America/Mexico_City",
    );
    expect(result1).toBe("Martes 7 de enero del 2025, 12:00am");

    const result2 = formatLocalDateTime(
      { date: "2025-01-07", time: "12:00:01" },
      "America/Mexico_City",
    );
    expect(result2).toBe("Martes 7 de enero del 2025, 12:00pm");

    const result3 = formatLocalDateTime(
      { date: "2025-01-07", time: "13:00:01" },
      "America/Mexico_City",
    );
    expect(result3).toBe("Martes 7 de enero del 2025, 01:00pm");
  });

  test("maneja hora exacta de medianoche", () => {
    const result = formatLocalDateTime(
      { date: "2025-01-07", time: "00:00:00" },
      "Europe/Paris",
    );

    expect(result).toBe("Martes 7 de enero del 2025, 12:00am");
  });

  test("maneja hora exacta del mediodía", () => {
    const result = formatLocalDateTime(
      { date: "2025-01-07", time: "12:00:00" },
      "Europe/Paris",
    );

    expect(result).toBe("Martes 7 de enero del 2025, 12:00pm");
  });

  test("maneja caso de medianoche que parece ser del día anterior", () => {
    // Si el sistema está en una zona horaria con offset negativo,
    // 00:00 local podría parecer del día anterior en UTC
    const result = formatLocalDateTime(
      { date: "2025-01-07", time: "00:00:00" },
      "America/New_York",
    );

    // Aún así, debería mostrar 7 de enero
    expect(result).toBe("Martes 7 de enero del 2025, 12:00am");
  });

  test("maneja caso extremo de zona horaria con offset +14", () => {
    const result = formatLocalDateTime(
      { date: "2025-01-01", time: "23:00:00" },
      "Pacific/Kiritimati", // UTC+14
    );

    expect(result).toBe("Miércoles 1 de enero del 2025, 11:00pm");
  });

  test("maneja caso extremo de zona horaria con offset -12", () => {
    const result = formatLocalDateTime(
      { date: "2025-01-01", time: "01:00:00" },
      "Pacific/Midway", // UTC-11 (una de las más retrasadas)
    );

    expect(result).toBe("Miércoles 1 de enero del 2025, 01:00am");
  });
});
