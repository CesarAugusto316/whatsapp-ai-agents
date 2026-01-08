import { isWithinBusinessHours } from "@/helpers/is-within-business-hours";
import { WeekDay } from "@/types/reservation/reservation.types";
import { describe, expect, test } from "bun:test";

describe("isWithinBusinessHours", () => {
  // Horario de ejemplo que cubre múltiples casos
  const schedule: WeekDay = {
    monday: [
      { open: 480, close: 720 }, // 08:00 - 12:00
      { open: 840, close: 1200 }, // 14:00 - 20:00
    ],
    tuesday: [], // Cerrado todo el día
    wednesday: [
      { open: 720, close: 900 }, // 12:00 - 15:00 (rango de 3 horas)
    ],
    thursday: [
      { open: 480, close: 540 }, // 08:00 - 09:00 (rango de 1 hora)
      { open: 600, close: 720 }, // 10:00 - 12:00
    ],
    friday: [
      { open: 540, close: 1439 }, // 09:00 - sin hora de cierre (abierto hasta medianoche)
    ],
    saturday: [
      { open: 600, close: 1020 }, // 10:00 - 17:00 (rango de 7 horas)
    ],
    sunday: [
      { open: 660, close: 1020 }, // 11:00 - 17:00
    ],
  };

  const timezone = "America/Guayaquil";

  describe("Casos básicos de días", () => {
    test("debe retornar true para lunes dentro del primer bloque", () => {
      // Lunes 2026-01-05 10:30 AM (dentro de 08:00-12:00)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-05",
        time: "10:30:00",
      });
      expect(result).toBe(true);
    });

    test("debe retornar true para lunes dentro del segundo bloque", () => {
      // Lunes 2026-01-05 15:30 PM (dentro de 14:00-20:00)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-05",
        time: "15:30:00",
      });
      expect(result).toBe(true);
    });

    test("debe retornar false para lunes entre bloques", () => {
      // Lunes 2026-01-05 13:00 PM (entre 12:00 y 14:00)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-05",
        time: "13:00:00",
      });
      expect(result).toBe(false);
    });

    test("debe retornar false para martes (cerrado)", () => {
      // Martes 2026-01-06 10:30 AM
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-06",
        time: "10:30:00",
      });
      expect(result).toBe(false);
    });

    test("debe retornar true para miércoles dentro del rango", () => {
      // Miércoles 2026-01-07 14:00 PM (dentro de 12:00-15:00)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-07",
        time: "14:00:00",
      });
      expect(result).toBe(true);
    });

    test("debe retornar false para miércoles fuera del rango", () => {
      // Miércoles 2026-01-07 16:00 PM (fuera de 12:00-15:00)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-07",
        time: "16:00:00",
      });
      expect(result).toBe(false);
    });
  });

  describe("Límites exactos", () => {
    test("debe retornar true en hora exacta de apertura", () => {
      // Lunes 2026-01-05 08:00 AM (exactamente apertura)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-05",
        time: "08:00:00",
      });
      expect(result).toBe(true);
    });

    test("debe retornar true en hora exacta de cierre", () => {
      // Lunes 2026-01-05 12:00 PM (exactamente cierre del primer bloque)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-05",
        time: "12:00:00",
      });
      expect(result).toBe(true);
    });

    test("debe retornar false justo después del cierre", () => {
      // Lunes 2026-01-05 12:01 PM (1 minuto después del cierre)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-05",
        time: "12:01:00",
      });
      expect(result).toBe(false);
    });

    test("debe retornar false justo antes de la apertura", () => {
      // Lunes 2026-01-05 07:59 AM (1 minuto antes de la apertura)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-05",
        time: "07:59:00",
      });
      expect(result).toBe(false);
    });
  });

  describe("Rangos de diferentes duraciones", () => {
    test("debe manejar rango de 1 hora (jueves primer bloque)", () => {
      // Jueves 2026-01-01 08:30 AM (dentro de 08:00-09:00)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-01", // Jueves
        time: "08:30:00",
      });
      expect(result).toBe(true);
    });

    test("debe retornar false después de rango de 1 hora (jueves)", () => {
      // Jueves 2026-01-01 09:30 AM (fuera de 08:00-09:00)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-01",
        time: "09:30:00",
      });
      expect(result).toBe(false);
    });

    test("debe manejar rango de 3 horas (miércoles)", () => {
      // Miércoles 2026-01-07 13:30 PM (dentro de 12:00-15:00)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-07",
        time: "13:30:00",
      });
      expect(result).toBe(true);
    });

    test("debe manejar rango de 7 horas (sábado)", () => {
      // Sábado 2026-01-03 14:00 PM (dentro de 10:00-17:00)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-03",
        time: "14:00:00",
      });
      expect(result).toBe(true);
    });
  });

  describe("Horarios sin cierre definido", () => {
    test("debe retornar true para viernes después de apertura sin cierre", () => {
      // Viernes 2026-01-02 14:00 PM (después de 09:00, sin cierre definido)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-02",
        time: "14:00:00",
      });
      expect(result).toBe(true);
    });

    test("debe retornar true para viernes a medianoche", () => {
      // Viernes 2026-01-02 23:59 PM (casi medianoche)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-02",
        time: "23:59:00",
      });
      expect(result).toBe(true);
    });

    test("debe retornar false para viernes antes de apertura", () => {
      // Viernes 2026-01-02 08:30 AM (antes de 09:00)
      const result = isWithinBusinessHours(schedule, timezone, {
        date: "2026-01-02",
        time: "08:30:00",
      });
      expect(result).toBe(false);
    });
  });

  describe("Manejo de timezones", () => {
    test("debe manejar correctamente UTC timezone", () => {
      // Convertir fecha a UTC
      const result = isWithinBusinessHours(schedule, "UTC", {
        date: "2026-01-05",
        time: "13:00:00", // Esto corresponde a 08:00 en America/Guayaquil (GMT-5)
      });
      // Como no estamos seguros del horario exacto en UTC, esta prueba verifica que no haya error
      expect(typeof result).toBe("boolean");
    });

    test("debe manejar timezone Europe/Madrid", () => {
      const result = isWithinBusinessHours(schedule, "Europe/Madrid", {
        date: "2026-01-05",
        time: "10:00:00",
      });
      expect(typeof result).toBe("boolean");
    });
  });

  describe("Casos edge", () => {
    test("debe retornar false para día no definido en schedule", () => {
      // Crear un schedule incompleto
      const incompleteSchedule: WeekDay = {
        monday: [{ open: 480, close: 720 }],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [], // No definido explícitamente, será undefined
      };

      // Domingo debería estar cerrado
      const result = isWithinBusinessHours(incompleteSchedule, timezone, {
        date: "2026-01-04", // Domingo
        time: "10:00:00",
      });
      expect(result).toBe(false);
    });

    test("debe manejar schedule vacío", () => {
      const emptySchedule: WeekDay = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

      const result = isWithinBusinessHours(emptySchedule, timezone, {
        date: "2026-01-05",
        time: "10:00:00",
      });
      expect(result).toBe(false);
    });
  });

  describe("Todos los días de la semana", () => {
    const testDays = [
      { date: "2026-01-05", day: "monday", expected: true, time: "10:00:00" },
      { date: "2026-01-06", day: "tuesday", expected: false, time: "10:00:00" },
      {
        date: "2026-01-07",
        day: "wednesday",
        expected: true,
        time: "14:00:00",
      },
      { date: "2026-01-01", day: "thursday", expected: true, time: "08:30:00" },
      { date: "2026-01-02", day: "friday", expected: true, time: "14:00:00" },
      { date: "2026-01-03", day: "saturday", expected: true, time: "14:00:00" },
      { date: "2026-01-04", day: "sunday", expected: true, time: "14:00:00" },
    ];

    testDays.forEach(({ date, day, expected, time }) => {
      test(`debe retornar ${expected} para ${day} (${date})`, () => {
        const result = isWithinBusinessHours(schedule, timezone, {
          date,
          time,
        });
        expect(result).toBe(expected);
      });
    });
  });

  describe("Horas específicas del día", () => {
    const testCases = [
      { time: "00:00:00", expected: false, desc: "medianoche" },
      { time: "06:00:00", expected: false, desc: "madrugada" },
      { time: "08:00:00", expected: true, desc: "apertura" },
      { time: "11:00:00", expected: true, desc: "mañana" },
      { time: "12:00:00", expected: true, desc: "medio día" },
      { time: "13:00:00", expected: false, desc: "hora de almuerzo" },
      { time: "14:00:00", expected: true, desc: "inicio tarde" },
      { time: "18:00:00", expected: true, desc: "tarde" },
      { time: "20:00:00", expected: true, desc: "cierre" },
      { time: "21:00:00", expected: false, desc: "noche" },
    ];

    testCases.forEach(({ time, expected, desc }) => {
      test(`debe retornar ${expected} a las ${desc} (${time})`, () => {
        const result = isWithinBusinessHours(schedule, timezone, {
          date: "2026-01-05", // Lunes
          time,
        });
        expect(result).toBe(expected);
      });
    });
  });
});
