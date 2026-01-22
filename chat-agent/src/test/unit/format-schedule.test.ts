import { formatSchedule } from "@/domain/utilities";
import { WeekDay } from "@/infraestructure/http/cms";
import { describe, test, expect } from "bun:test";

describe("formatSchedule", () => {
  // Helper para crear slots de tiempo
  const createSlot = (
    openHour: number,
    openMinute: number,
    closeHour: number,
    closeMinute: number,
  ) => ({
    open: openHour * 60 + openMinute,
    close: closeHour * 60 + closeMinute,
  });

  test("debe formatear correctamente un horario completo", () => {
    const schedule: WeekDay = {
      monday: [createSlot(8, 0, 12, 0), createSlot(14, 0, 20, 0)],
      tuesday: [],
      wednesday: [createSlot(12, 0, 15, 0), createSlot(18, 0, 22, 0)],
      thursday: [createSlot(8, 0, 12, 0)],
      friday: [createSlot(9, 0, 17, 30)],
      saturday: null,
      sunday: undefined,
    };

    const timezone = "America/Guayaquil";
    const result = formatSchedule(schedule, timezone);

    const expected = `
TIMEZONE: ${timezone}

DAY: MONDAY
STATUS: OPEN
RANGE: 08:00-12:00
RANGE: 14:00-20:00

DAY: TUESDAY
STATUS: CLOSED

DAY: WEDNESDAY
STATUS: OPEN
RANGE: 12:00-15:00
RANGE: 18:00-22:00

DAY: THURSDAY
STATUS: OPEN
RANGE: 08:00-12:00

DAY: FRIDAY
STATUS: OPEN
RANGE: 09:00-17:30

DAY: SATURDAY
STATUS: CLOSED

DAY: SUNDAY
STATUS: CLOSED
`.trim();

    expect(result).toBe(expected);
  });

  test("debe manejar horarios que pasan de medianoche", () => {
    const schedule: WeekDay = {
      friday: [createSlot(22, 0, 2, 30)], // 22:00 a 02:30 (día siguiente)
    };

    const result = formatSchedule(schedule, "Europe/Madrid");

    expect(result).toContain("RANGE: 22:00-02:30");
  });

  test("debe manejar minutos con ceros iniciales", () => {
    const schedule: WeekDay = {
      monday: [createSlot(9, 5, 17, 8)], // 09:05 a 17:08
    };

    const result = formatSchedule(schedule, "UTC");

    expect(result).toContain("RANGE: 09:05-17:08");
  });

  test("debe manejar todas las propiedades opcionales como undefined", () => {
    const schedule: WeekDay = {};

    const result = formatSchedule(schedule, "Pacific/Honolulu");

    // Verifica que todos los días estén cerrados
    const days = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ];
    days.forEach((day) => {
      expect(result).toContain(`DAY: ${day}\nSTATUS: CLOSED`);
    });
  });

  test("debe manejar slots vacíos como cerrado", () => {
    const schedule: WeekDay = {
      monday: [],
      tuesday: [],
    };

    const result = formatSchedule(schedule, "Asia/Tokyo");

    expect(result).toContain("DAY: MONDAY\nSTATUS: CLOSED");
    expect(result).toContain("DAY: TUESDAY\nSTATUS: CLOSED");
  });

  test("debe mostrar correctamente cuando un día está abierto 24 horas", () => {
    const schedule: WeekDay = {
      sunday: [createSlot(0, 0, 24, 0)],
    };

    const result = formatSchedule(schedule, "UTC");

    expect(result).toContain("RANGE: 00:00-24:00");
  });

  test("debe mantener el orden de los días de la semana", () => {
    const schedule: WeekDay = {
      sunday: [createSlot(9, 0, 17, 0)],
      monday: [createSlot(8, 0, 16, 0)],
    };

    const result = formatSchedule(schedule, "America/New_York");
    const lines = result.split("\n");

    // Encuentra las posiciones de los días
    const mondayIndex = lines.findIndex((line) => line.includes("DAY: MONDAY"));
    const sundayIndex = lines.findIndex((line) => line.includes("DAY: SUNDAY"));

    // Verifica el orden (lunes antes que domingo)
    expect(mondayIndex).toBeLessThan(sundayIndex);
  });

  test("debe manejar diferentes zonas horarias correctamente", () => {
    const schedule: WeekDay = {
      wednesday: [createSlot(10, 30, 18, 45)],
    };

    const timezones = [
      "America/Los_Angeles",
      "Europe/London",
      "Asia/Kolkata",
      "Australia/Sydney",
      "Africa/Cairo",
    ];

    timezones.forEach((timezone) => {
      const result = formatSchedule(schedule, timezone);

      // Verifica que la zona horaria se muestra correctamente
      expect(result).toStartWith(`TIMEZONE: ${timezone}`);
      // Verifica que el horario se mantiene igual (los minutos no cambian con timezone)
      expect(result).toContain("RANGE: 10:30-18:45");
    });
  });

  test("debe manejar múltiples slots por día", () => {
    const schedule: WeekDay = {
      saturday: [
        createSlot(6, 0, 9, 0),
        createSlot(11, 30, 14, 0),
        createSlot(16, 0, 20, 0),
      ],
    };

    const result = formatSchedule(schedule, "America/Chicago");

    // Verifica que todos los slots estén presentes
    expect(result).toContain("RANGE: 06:00-09:00");
    expect(result).toContain("RANGE: 11:30-14:00");
    expect(result).toContain("RANGE: 16:00-20:00");

    // Verifica el orden de los slots
    const lines = result.split("\n");
    const rangeLines = lines.filter((line) => line.startsWith("RANGE:"));

    expect(rangeLines[0]).toContain("06:00-09:00");
    expect(rangeLines[1]).toContain("11:30-14:00");
    expect(rangeLines[2]).toContain("16:00-20:00");
  });

  test("debe manejar casos borde de minutos (0, 59)", () => {
    const schedule: WeekDay = {
      thursday: [
        createSlot(0, 0, 0, 1), // 00:00 a 00:01
        createSlot(23, 59, 24, 0), // 23:59 a 24:00
      ],
    };

    const result = formatSchedule(schedule, "UTC");

    expect(result).toContain("RANGE: 00:00-00:01");
    expect(result).toContain("RANGE: 23:59-24:00");
  });
});
