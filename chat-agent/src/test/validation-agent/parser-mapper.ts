import { mapZodErrorsToCollector, phase2 } from "@/types/reservation/schemas";
import { describe, expect, test } from "bun:test";

// Example 7 - No time or date:
// Input: "Para 2 personas"
// Output:
// {
//   "customerName": "",
//   "datetime": {
//     "start": { "date": "", "time": "" },
//     "end": { "date": "", "time": "" }
//   },
//   "numberOfPeople": 2
// }

// Example 8 - Time WITHOUT date:
// Input: "A las 8pm para 2 personas"
// Output:
// {
//   "customerName": "",
//   "datetime": {
//     "start": { "date": "", "time": "20:00:00" },
//     "end": { "date": "", "time": "${(() => {
//       const hours = Math.floor(averageTimeMinutes / 60);
//       const minutes = averageTimeMinutes % 60;
//       const endHour = 20 + hours;
//       const endMinute = minutes.toString().padStart(2, "0");
//       return `${endHour.toString().padStart(2, "0")}:${endMinute}:00`;
//     })()}" }
//   },
//   "numberOfPeople": 2
// }

// Example 9 - Date WITHOUT time:
// Input: "Para mañana para 2 personas"
// Output:
// {
//   "customerName": "",
//   "datetime": {
//     "start": { "date": "${formatDate(tomorrow)}", "time": "" },
//     "end": { "date": "${formatDate(tomorrow)}", "time": "" }
//   },
//   "numberOfPeople": 2
// }

/**
 *
 * @todo agregar test similares a los ejmplos 7, 8, 9 del prompt dataParser
 */
describe("Esquema phase2 - Validaciones", () => {
  const baseData = {
    customerName: "Juan Pérez",
    datetime: {
      start: { date: "2024-12-01", time: "20:00:00" },
      end: { date: "2024-12-01", time: "21:00:00" },
    },
    numberOfPeople: 4,
  };

  describe("Validación exitosa", () => {
    test("Datos válidos pasan la validación", () => {
      const result = phase2.safeParse(baseData);
      expect(result.success).toBe(true);
    });

    test("Datos válidos con cruce de medianoche", () => {
      const data = {
        ...baseData,
        datetime: {
          start: { date: "2024-12-01", time: "23:00:00" },
          end: { date: "2024-12-02", time: "01:00:00" },
        },
      };
      const result = phase2.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("Validaciones de customerName", () => {
    test("Nombre muy corto (too_short)", () => {
      const data = { ...baseData, customerName: "Jo" };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "customerName",
            error: "too_short: Mínimo 3 caracteres",
          }),
        );
      }
    });

    test("Nombre muy largo (too_long)", () => {
      const data = {
        ...baseData,
        customerName: "Juan".repeat(10), // 40 caracteres
      };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "customerName",
            error: "too_long: Máximo 30 caracteres",
          }),
        );
      }
    });

    test("Formato inválido con números (invalid_format)", () => {
      const data = { ...baseData, customerName: "Juan123" };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "customerName",
            error: "invalid_format: Solo letras y espacios",
          }),
        );
      }
    });

    test("Nombre vacío (falta required)", () => {
      const data = { ...baseData, customerName: "" };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "customerName",
            error: expect.stringContaining("too_short"),
          }),
        );
      }
    });
  });

  describe("Validaciones de datetime", () => {
    test("Formato de fecha inválido (invalid_date_format)", () => {
      const data = {
        ...baseData,
        datetime: {
          start: { date: "01-12-2024", time: "20:00:00" }, // Formato incorrecto
          end: { date: "2024-12-01", time: "21:00:00" },
        },
      };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "startDate",
            error: "invalid_date_format",
          }),
        );
      }
    });

    test("Fecha inválida (invalid_date)", () => {
      const data = {
        ...baseData,
        datetime: {
          start: { date: "2024-13-01", time: "20:00:00" }, // Mes inválido
          end: { date: "2024-12-01", time: "21:00:00" },
        },
      };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        // Dependiendo de cómo implementes la validación de fecha
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "startDate",
            error: expect.stringContaining("invalid"),
          }),
        );
      }
    });

    test("Formato de hora inválido (invalid_time_format)", () => {
      const data = {
        ...baseData,
        datetime: {
          start: { date: "2024-12-01", time: "8:00:00" }, // Faltan ceros
          end: { date: "2024-12-01", time: "21:00:00" },
        },
      };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "startTime",
            error: "invalid_time_format",
          }),
        );
      }
    });

    test("Hora inválida (invalid_time)", () => {
      const data = {
        ...baseData,
        datetime: {
          start: { date: "2024-12-01", time: "25:00:00" }, // Hora > 23
          end: { date: "2024-12-01", time: "21:00:00" },
        },
      };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "startTime",
            error: expect.stringContaining("invalid_time"),
          }),
        );
      }
    });

    test("Fecha/hora de fin anterior a inicio (end_before_start)", () => {
      const data = {
        ...baseData,
        datetime: {
          start: { date: "2024-12-01", time: "20:00:00" },
          end: { date: "2024-12-01", time: "19:00:00" }, // Antes del inicio
        },
      };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "datetime",
            error:
              "end_before_start: La hora de fin debe ser después de la hora de inicio",
          }),
        );
      }
    });

    test("Fecha/hora de fin igual a inicio", () => {
      const data = {
        ...baseData,
        datetime: {
          start: { date: "2024-12-01", time: "20:00:00" },
          end: { date: "2024-12-01", time: "20:00:00" }, // Igual
        },
      };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "datetime",
            error: expect.stringContaining("end_before_start"),
          }),
        );
      }
    });
  });

  describe("Validaciones de numberOfPeople", () => {
    test("Número muy pequeño (too_small)", () => {
      const data = { ...baseData, numberOfPeople: 0 };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "numberOfPeople",
            error: "too_small: Mínimo 1 persona",
          }),
        );
      }
    });

    test("Número muy grande (too_large)", () => {
      const data = { ...baseData, numberOfPeople: 101 };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "numberOfPeople",
            error: "too_large: Máximo 100 personas",
          }),
        );
      }
    });

    test("No es entero (not_integer)", () => {
      const data = { ...baseData, numberOfPeople: 4.5 };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "numberOfPeople",
            error: "not_integer: Debe ser un número entero",
          }),
        );
      }
    });
  });

  describe("Múltiples errores simultáneos", () => {
    test("Varios campos inválidos", () => {
      const data = {
        customerName: "Jo", // Demasiado corto
        datetime: {
          start: { date: "2024-12-01", time: "25:00:00" }, // Hora inválida
          end: { date: "2024-12-01", time: "18:00:00" }, // Antes del inicio
        },
        numberOfPeople: -1, // Muy pequeño
      };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);

        // Debería tener errores para customerName, startTime, datetime, numberOfPeople
        expect(mapped).toHaveLength(4);

        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "customerName",
            error: expect.stringContaining("too_short"),
          }),
        );

        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "startTime",
            error: expect.stringContaining("invalid_time"),
          }),
        );

        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "datetime",
            error: expect.stringContaining("end_before_start"),
          }),
        );

        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "numberOfPeople",
            error: expect.stringContaining("too_small"),
          }),
        );
      }
    });
  });

  describe("Campos faltantes", () => {
    test("Todos los campos faltantes", () => {
      const result = phase2.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);

        // Debería tener errores para customerName, datetime, numberOfPeople
        expect(mapped.length).toBe(3);

        // Verificar que tiene estos tres errores específicos
        const fields = mapped.map((e) => e.field);

        // Cuando falta el objeto datetime completo, se reporta error en "datetime"
        expect(fields).toContain("customerName");
        expect(fields).toContain("datetime"); // ¡Cambiado de "startDate" a "datetime"!
        expect(fields).toContain("numberOfPeople");

        // Podemos verificar los mensajes también
        // const datetimeError = mapped.find((e) => e.field === "datetime");
        // expect(datetimeError?.error).toMatch(/required/i); // Debería indicar que es requerido
      }
    });

    test("Objeto datetime presente pero con subcampos vacíos", () => {
      const data = {
        customerName: "Juan Pérez",
        datetime: {
          start: { date: "", time: "" }, // Faltan subcampos
          end: { date: "", time: "" },
        },
        numberOfPeople: 4,
      };

      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);

        // Ahora SÍ debería tener errores para startDate, startTime, etc.
        const fields = mapped.map((e) => e.field);
        expect(fields).toContain("startDate"); // ¡Ahora sí!
        expect(fields).toContain("startTime");
        expect(fields).toContain("endDate");
        expect(fields).toContain("endTime");
      }
    });

    test("Solo falta fecha de inicio", () => {
      const data = {
        ...baseData,
        datetime: {
          start: { date: "", time: "20:00:00" }, // Fecha vacía
          end: { date: "2024-12-01", time: "21:00:00" },
        },
      };
      const result = phase2.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mapped = mapZodErrorsToCollector(result.error);
        expect(mapped).toContainEqual(
          expect.objectContaining({
            field: "startDate",
            error: expect.stringContaining("invalid"),
          }),
        );
      }
    });
  });
});
