// Tests unitarios con bun:test
import { checkUtcDateInRange } from "@/domain/utilities/datetime-formatting/check-date-in-range";
import { describe, expect, test } from "bun:test";

describe("isDateInRange", () => {
  const vacationRange = {
    startDate: "2026-01-19T12:00:17.000Z",
    endDate: "2026-01-25T12:00:17.000Z",
  };

  // Escenario 1: Fecha dentro del rango
  test("debe retornar true cuando la fecha está dentro del rango", () => {
    const dateInRange = "2026-01-21T12:00:17.000Z";
    expect(checkUtcDateInRange(vacationRange, dateInRange)).toBe(true);
  });

  // Escenario 2: Fecha igual a startDate
  test("debe retornar true cuando la fecha es igual a startDate", () => {
    const dateEqualToStart = "2026-01-19T12:00:17.000Z";
    expect(checkUtcDateInRange(vacationRange, dateEqualToStart)).toBe(true);
  });

  // Escenario 3: Fecha igual a endDate
  test("debe retornar true cuando la fecha es igual a endDate", () => {
    const dateEqualToEnd = "2026-01-25T12:00:17.000Z";
    expect(checkUtcDateInRange(vacationRange, dateEqualToEnd)).toBe(true);
  });

  // Escenario 4: Fecha antes del rango
  test("debe retornar false cuando la fecha es anterior al rango", () => {
    const dateBeforeRange = "2026-01-18T23:59:59.999Z";
    expect(checkUtcDateInRange(vacationRange, dateBeforeRange)).toBe(false);
  });

  // Escenario 5: Fecha después del rango
  test("debe retornar false cuando la fecha es posterior al rango", () => {
    const dateAfterRange = "2026-01-26T00:00:00.000Z";
    expect(checkUtcDateInRange(vacationRange, dateAfterRange)).toBe(false);
  });

  // Escenario 6: Fecha justo después de endDate
  test("debe retornar false para fecha un milisegundo después de endDate", () => {
    const dateJustAfterEnd = "2026-01-25T12:00:17.001Z";
    expect(checkUtcDateInRange(vacationRange, dateJustAfterEnd)).toBe(false);
  });

  // Escenario 7: Fecha justo antes de startDate
  test("debe retornar false para fecha un milisegundo antes de startDate", () => {
    const dateJustBeforeStart = "2026-01-19T12:00:16.999Z";
    expect(checkUtcDateInRange(vacationRange, dateJustBeforeStart)).toBe(false);
  });

  // Escenario 8: Fecha en medio del rango con hora diferente
  test("debe retornar true para cualquier hora dentro del rango de fechas", () => {
    const dateDifferentTime = "2026-01-22T00:00:00.000Z";
    expect(checkUtcDateInRange(vacationRange, dateDifferentTime)).toBe(true);
  });

  // Escenario 9: Rango de un solo día
  test("debe funcionar correctamente con rango de un solo día", () => {
    const singleDayRange = {
      startDate: "2026-01-19T00:00:00.000Z",
      endDate: "2026-01-19T23:59:59.999Z",
    };
    expect(
      checkUtcDateInRange(singleDayRange, "2026-01-19T12:00:00.000Z"),
    ).toBe(true);
    expect(
      checkUtcDateInRange(singleDayRange, "2026-01-20T00:00:00.000Z"),
    ).toBe(false);
  });

  // Escenario 10: Fechas inválidas
  test("debe lanzar error para fechas inválidas", () => {
    const invalidRange = {
      startDate: "fecha-invalida",
      endDate: "2026-01-25T12:00:17.000Z",
    };
    expect(() =>
      checkUtcDateInRange(invalidRange, "2026-01-21T12:00:17.000Z"),
    ).toThrow();
  });

  // Escenario 11: Fecha con diferente zona horaria (debe ser tratada como UTC)
  test("debe manejar fechas con información de zona horaria correctamente", () => {
    // Esta fecha en UTC es equivalente a 2026-01-20T14:00:17.000Z
    const dateWithOffset = "2026-01-20T09:00:17.000-05:00";
    expect(checkUtcDateInRange(vacationRange, dateWithOffset)).toBe(true);
  });
});
