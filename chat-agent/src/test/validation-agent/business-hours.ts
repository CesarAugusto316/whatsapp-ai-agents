import {
  DateTimeRange,
  validateBusinessHours,
  WeeklySchedule,
} from "@/helpers/validate-business-hours";
import { describe, test, expect } from "bun:test";

export const testSchedule: WeeklySchedule = {
  monday: [
    { open: 8 * 60, close: 12 * 60 }, // 08:00 - 12:00
    { open: 14 * 60, close: 20 * 60 }, // 14:00 - 20:00
  ],
  tuesday: [
    { open: 8 * 60, close: 12 * 60 },
    { open: 14 * 60, close: 20 * 60 },
  ],
  // ... otros días
};

describe("validateBusinessHours", () => {
  test("Horario válido dentro de intervalo", () => {
    const datetime: DateTimeRange = {
      start: { date: "2024-12-02", time: "09:00:00" }, // Lunes
      end: { date: "2024-12-02", time: "10:00:00" },
    };

    const result = validateBusinessHours(datetime, testSchedule);
    expect(result.isValid).toBe(true);
  });

  test("Horario inválido - fuera de horario", () => {
    const datetime: DateTimeRange = {
      start: { date: "2024-12-02", time: "13:00:00" }, // Lunes, hora de descanso
      end: { date: "2024-12-02", time: "14:30:00" },
    };

    const result = validateBusinessHours(datetime, testSchedule);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("El horario de inicio");
  });

  test("Reserva que abarca múltiples intervalos", () => {
    const datetime: DateTimeRange = {
      start: { date: "2024-12-02", time: "11:00:00" }, // 11:00-13:00 cruza el descanso
      end: { date: "2024-12-02", time: "13:00:00" },
    };

    const result = validateBusinessHours(datetime, testSchedule);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("no puede abarcar múltiples intervalos");
  });

  test("Día cerrado", () => {
    const datetime: DateTimeRange = {
      start: { date: "2024-12-01", time: "10:00:00" }, // Domingo (no definido)
      end: { date: "2024-12-01", time: "11:00:00" },
    };

    const result = validateBusinessHours(datetime, testSchedule);
    expect(result.isValid).toBe(false);
  });
});
