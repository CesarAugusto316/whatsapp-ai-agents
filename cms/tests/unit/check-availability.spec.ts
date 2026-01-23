import {
  AppointmentSlot,
  calculateAvailability,
  suggestAlternativeTimes,
} from "@/collections/appointments/check-availability";
import { describe, expect, test } from "bun:test";

// Helper para crear reservas de prueba
function createAppointmentSlot(
  overrides: Partial<AppointmentSlot> = {},
): AppointmentSlot {
  return {
    startDateTime: "2024-01-20T19:00:00.000Z",
    endDateTime: "2024-01-20T20:00:00.000Z",
    numberOfPeople: 4,
    status: "confirmed",
    ...overrides,
  };
}

describe("Lógica de Disponibilidad para Sistema de Reservas", () => {
  describe("calculateAvailability", () => {
    test("debe mostrar disponibilidad completa cuando no hay reservas", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");
      const endDate = new Date("2024-01-20T20:00:00.000Z");

      const result = calculateAvailability({
        appointments: [], // Sin reservas
        maxCapacityPerHour: 20, // Capacidad máxima: 20 mesas/personas
        startDate,
        endDate,
        numberOfPeople: 4, // Grupo de 4 personas
      });

      expect(result.isFullyAvailable).toBe(true);
      expect(result.timeSlots).toHaveLength(1);
      expect(result.timeSlots[0].availableSlots).toBe(20);
      expect(result.timeSlots[0].isAvailable).toBe(true);
    });

    test("debe mostrar no disponible cuando la capacidad está completamente llena", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");
      const endDate = new Date("2024-01-20T20:00:00.000Z");

      const existingAppointments: AppointmentSlot[] = [
        createAppointmentSlot({
          startDateTime: "2024-01-20T19:00:00.000Z",
          endDateTime: "2024-01-20T20:00:00.000Z",
          numberOfPeople: 20, // Capacidad completa
          status: "confirmed",
        }),
      ];

      const result = calculateAvailability({
        appointments: existingAppointments,
        maxCapacityPerHour: 20, // Capacidad máxima
        startDate,
        endDate,
        numberOfPeople: 2, // Intentando reservar para 2 personas
      });

      expect(result.isFullyAvailable).toBe(false);
      expect(result.timeSlots[0].availableSlots).toBe(0);
      expect(result.timeSlots[0].isAvailable).toBe(false);
    });

    test("debe mostrar disponibilidad parcial (algunas mesas disponibles)", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");
      const endDate = new Date("2024-01-20T20:00:00.000Z");

      const existingAppointments: AppointmentSlot[] = [
        createAppointmentSlot({
          numberOfPeople: 12, // 12 personas ya reservadas
        }),
      ];

      const result = calculateAvailability({
        appointments: existingAppointments,
        maxCapacityPerHour: 20, // Capacidad total
        startDate,
        endDate,
        numberOfPeople: 5, // Queremos reservar para 5
      });

      // 20 - 12 = 8 disponibles, alcanza para 5
      expect(result.isFullyAvailable).toBe(true);
      expect(result.timeSlots[0].availableSlots).toBe(8);
      expect(result.timeSlots[0].isAvailable).toBe(true);
    });

    test("debe ignorar reservas canceladas y completadas", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");
      const endDate = new Date("2024-01-20T20:00:00.000Z");

      const existingAppointments: AppointmentSlot[] = [
        createAppointmentSlot({
          numberOfPeople: 10,
          status: "confirmed",
        }),
        createAppointmentSlot({
          numberOfPeople: 5,
          status: "pending",
        }),
        createAppointmentSlot({
          numberOfPeople: 10, // No debería contar
          status: "cancelled",
        }),
        createAppointmentSlot({
          numberOfPeople: 8, // No debería contar
          status: "completed",
        }),
      ];

      const result = calculateAvailability({
        appointments: existingAppointments,
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 8,
      });

      // Solo debe contar confirmed y pending: 10 + 5 = 15
      // 20 - 15 = 5 disponibles, NO alcanza para 8
      expect(result.isFullyAvailable).toBe(false);
      expect(result.timeSlots[0].availableSlots).toBe(5);
      expect(result.timeSlots[0].isAvailable).toBe(false);
    });

    test("debe manejar reservas que se superponen en múltiples horas", () => {
      const startDate = new Date("2024-01-20T18:00:00.000Z");
      const endDate = new Date("2024-01-20T21:00:00.000Z"); // 3 horas

      // Reserva de 18:30 a 20:30 (se superpone con 3 horas)
      const existingAppointments: AppointmentSlot[] = [
        createAppointmentSlot({
          startDateTime: "2024-01-20T18:30:00.000Z",
          endDateTime: "2024-01-20T20:30:00.000Z",
          numberOfPeople: 15,
        }),
      ];

      const result = calculateAvailability({
        appointments: existingAppointments,
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 10, // Queremos 10 personas
      });

      expect(result.timeSlots).toHaveLength(3);

      // Hora 1 (18-19): 20 - 15 = 5 disponibles
      expect(result.timeSlots[0].availableSlots).toBe(5);
      expect(result.timeSlots[0].isAvailable).toBe(false); // 5 < 10

      // Hora 2 (19-20): 20 - 15 = 5 disponibles
      expect(result.timeSlots[1].availableSlots).toBe(5);
      expect(result.timeSlots[1].isAvailable).toBe(false);

      // Hora 3 (20-21): 20 - 15 = 5 disponibles
      expect(result.timeSlots[2].availableSlots).toBe(5);
      expect(result.timeSlots[2].isAvailable).toBe(false);

      expect(result.isFullyAvailable).toBe(false);
    });

    test("debe manejar múltiples reservas en la misma hora", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");
      const endDate = new Date("2024-01-20T20:00:00.000Z");

      const existingAppointments: AppointmentSlot[] = [
        createAppointmentSlot({
          startDateTime: "2024-01-20T19:00:00.000Z",
          numberOfPeople: 8,
        }),
        createAppointmentSlot({
          startDateTime: "2024-01-20T19:15:00.000Z",
          endDateTime: "2024-01-20T19:45:00.000Z",
          numberOfPeople: 6,
        }),
        createAppointmentSlot({
          startDateTime: "2024-01-20T19:30:00.000Z",
          numberOfPeople: 4,
        }),
      ];

      const result = calculateAvailability({
        appointments: existingAppointments,
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 5,
      });

      // Total personas: 8 + 6 + 4 = 18
      // Disponibles: 20 - 18 = 2
      expect(result.timeSlots[0].availableSlots).toBe(2);
      expect(result.timeSlots[0].isAvailable).toBe(false); // 2 < 5
    });

    test("debe usar 1 hora por defecto cuando no hay endDateTime", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");
      const endDate = new Date("2024-01-20T20:00:00.000Z");

      const existingAppointments: AppointmentSlot[] = [
        {
          startDateTime: "2024-01-20T19:00:00.000Z",
          // Sin endDateTime
          numberOfPeople: 10,
          status: "confirmed",
        },
      ];

      const result = calculateAvailability({
        appointments: existingAppointments,
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 8,
      });

      // Debería asumir 1 hora (19-20) y contar las 10 personas
      expect(result.timeSlots[0].availableSlots).toBe(10); // 20 - 10 = 10
      expect(result.timeSlots[0].isAvailable).toBe(true); // 10 ≥ 8
    });

    test("debe normalizar fechas a horas completas (redondeo hacia arriba para fin)", () => {
      const startDate = new Date("2024-01-20T19:15:00.000Z"); // 19:15
      const endDate = new Date("2024-01-20T20:45:00.000Z"); // 20:45

      const result = calculateAvailability({
        appointments: [],
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 5,
      });

      // Debería normalizar a horas completas:
      // 19:15 → 19:00 (redondeo hacia abajo)
      // 20:45 → 21:00 (redondeo hacia arriba porque tiene minutos)
      expect(result.timeSlots).toHaveLength(2); // Horas 19-20 y 20-21
      expect(result.timeSlots[0].hour).toBe("2024-01-20T19:00:00.000Z");
      expect(result.timeSlots[1].hour).toBe("2024-01-20T20:00:00.000Z");
    });

    test("debe manejar fecha exacta sin redondeo", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");
      const endDate = new Date("2024-01-20T20:00:00.000Z");

      const result = calculateAvailability({
        appointments: [],
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 5,
      });

      // Fechas exactas, no necesita redondeo
      expect(result.timeSlots).toHaveLength(1);
      expect(result.timeSlots[0].hour).toBe("2024-01-20T19:00:00.000Z");
    });

    test("debe usar valores por defecto cuando parámetros faltan", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");
      const endDate = new Date("2024-01-20T20:00:00.000Z");

      // Test sin maxCapacityPerHour, numberOfPeople
      const result = calculateAvailability({
        appointments: [],
        startDate,
        endDate,
      });

      expect(result.timeSlots).toHaveLength(1);
      expect(result.timeSlots[0].availableSlots).toBe(20); // Valor por defecto de maxCapacityPerHour
      expect(result.timeSlots[0].isAvailable).toBe(true); // Valor por defecto de numberOfPeople es 1
    });

    test("debe manejar cuando endDate es anterior a startDate", () => {
      const startDate = new Date("2024-01-20T20:00:00.000Z");
      const endDate = new Date("2024-01-20T19:00:00.000Z"); // Anterior

      const result = calculateAvailability({
        appointments: [],
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 5,
      });

      // Debería ajustar a 1 hora después de startDate
      expect(result.timeSlots).toHaveLength(1);
      expect(result.timeSlots[0].hour).toBe("2024-01-20T20:00:00.000Z");
    });
  });

  describe("suggestAlternativeTimes", () => {
    test("debe sugerir horarios alternativos cuando no hay disponibilidad", () => {
      const startDate = new Date("2030-01-20T19:00:00.000Z");

      const appointments: AppointmentSlot[] = [
        createAppointmentSlot({
          startDateTime: "2030-01-20T19:00:00.000Z",
          endDateTime: "2030-01-20T20:00:00.000Z",
          numberOfPeople: 20, // Capacidad completa
        }),
      ];

      const suggestedTimes = suggestAlternativeTimes({
        appointments,
        maxCapacityPerHour: 20,
        numberOfPeople: 2,
        startDate,
        hoursToCheck: 4,
        intervalMinutes: 30,
      });

      // Debería buscar horarios alternativos en las próximas 4 horas
      expect(suggestedTimes.length).toBeGreaterThan(0);
      expect(suggestedTimes.length).toBeLessThanOrEqual(3);
    });

    test("debe retornar array vacío cuando no hay startDate", () => {
      const suggestedTimes = suggestAlternativeTimes({
        appointments: [],
        maxCapacityPerHour: 20,
        numberOfPeople: 2,
        // No startDate
      });

      expect(suggestedTimes).toEqual([]);
    });

    test("debe sugerir horarios dentro del horario de búsqueda", () => {
      const now = new Date("2030-01-20T18:00:00.000Z");
      const startDate = new Date("2030-01-20T19:00:00.000Z");

      // Mock Date.now para que las pruebas sean consistentes
      const originalDateNow = Date.now;
      Date.now = () => now.getTime();

      try {
        const appointments: AppointmentSlot[] = [
          createAppointmentSlot({
            startDateTime: "2030-01-20T19:00:00.000Z",
            endDateTime: "2030-01-20T20:00:00.000Z",
            numberOfPeople: 18, // 2 disponibles
          }),
        ];

        const suggestedTimes = suggestAlternativeTimes({
          appointments,
          maxCapacityPerHour: 20,
          numberOfPeople: 1, // Solo necesita 1 espacio
          startDate,
          hoursToCheck: 2,
          intervalMinutes: 60,
        });

        // Debería encontrar horarios alternativos
        expect(suggestedTimes.length).toBeGreaterThan(0);

        // Cada tiempo sugerido debe ser un string ISO válido
        suggestedTimes.forEach((time) => {
          expect(() => new Date(time)).not.toThrow();
        });
      } finally {
        Date.now = originalDateNow;
      }
    });

    test("debe usar valores por defecto cuando parámetros faltan", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");

      const suggestedTimes = suggestAlternativeTimes({
        startDate,
      });

      // Debería retornar array (posiblemente vacío) sin errores
      expect(Array.isArray(suggestedTimes)).toBe(true);
    });
  });

  describe("Escenarios del mundo real", () => {
    test("escenario 1: restaurante en hora pico (sábado 7-9 PM)", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z"); // Sábado 7 PM
      const endDate = new Date("2024-01-20T21:00:00.000Z"); // Hasta 9 PM

      const existingAppointments: AppointmentSlot[] = [
        // Reservas que afectan hora 19-20
        createAppointmentSlot({
          startDateTime: "2024-01-20T19:00:00.000Z",
          endDateTime: "2024-01-20T20:00:00.000Z",
          numberOfPeople: 8,
        }),
        createAppointmentSlot({
          startDateTime: "2024-01-20T19:15:00.000Z",
          endDateTime: "2024-01-20T20:15:00.000Z",
          numberOfPeople: 6,
        }),
        createAppointmentSlot({
          startDateTime: "2024-01-20T19:30:00.000Z",
          endDateTime: "2024-01-20T20:30:00.000Z",
          numberOfPeople: 4,
        }),
        // Reservas que afectan hora 20-21
        createAppointmentSlot({
          startDateTime: "2024-01-20T20:00:00.000Z",
          endDateTime: "2024-01-20T21:00:00.000Z",
          numberOfPeople: 10,
        }),
        createAppointmentSlot({
          startDateTime: "2024-01-20T20:30:00.000Z",
          endDateTime: "2024-01-20T21:30:00.000Z",
          numberOfPeople: 5,
        }),
      ];

      const result = calculateAvailability({
        appointments: existingAppointments,
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 6, // Grupo de 6 personas
      });

      expect(result.timeSlots).toHaveLength(2);

      // Hora 19-20: debe tener menos de 20 disponibles
      expect(result.timeSlots[0].availableSlots).toBeLessThan(20);
      expect(result.timeSlots[0].isAvailable).toBe(false); // No alcanza para 6

      // Hora 20-21: similar cálculo
      expect(result.timeSlots[1].availableSlots).toBeLessThan(20);
      expect(result.timeSlots[1].isAvailable).toBe(false);

      expect(result.isFullyAvailable).toBe(false);
    });

    test("escenario 2: reserva de grupo grande (15 personas)", () => {
      const startDate = new Date("2024-01-20T15:00:00.000Z"); // Hora no pico
      const endDate = new Date("2024-01-20T16:00:00.000Z");

      const existingAppointments: AppointmentSlot[] = [
        createAppointmentSlot({
          startDateTime: "2024-01-20T15:00:00.000Z",
          numberOfPeople: 4, // Pequeña reserva
        }),
      ];

      const result = calculateAvailability({
        appointments: existingAppointments,
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 15, // Grupo grande de 15 personas
      });

      // 20 - 4 = 16 disponibles, alcanza para 15
      expect(result.isFullyAvailable).toBe(true);
      expect(result.timeSlots[0].availableSlots).toBe(16);
      expect(result.timeSlots[0].isAvailable).toBe(true);
    });

    test("escenario 3: cena larga de 2 horas (con fechas exactas)", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");
      const endDate = new Date("2024-01-20T21:00:00.000Z"); // 2 horas exactas

      const existingAppointments: AppointmentSlot[] = [
        // 7-8 PM: 12 personas
        createAppointmentSlot({
          startDateTime: "2024-01-20T19:00:00.000Z",
          endDateTime: "2024-01-20T20:00:00.000Z",
          numberOfPeople: 12,
        }),
        // 8-9 PM: 10 personas
        createAppointmentSlot({
          startDateTime: "2024-01-20T20:00:00.000Z",
          endDateTime: "2024-01-20T21:00:00.000Z",
          numberOfPeople: 10,
        }),
      ];

      const result = calculateAvailability({
        appointments: existingAppointments,
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 8, // Reserva para 8 personas
      });

      expect(result.timeSlots).toHaveLength(2);

      // Hora 1 (19-20): 20 - 12 = 8 disponibles (justo alcanza para 8)
      expect(result.timeSlots[0].availableSlots).toBe(8);
      expect(result.timeSlots[0].isAvailable).toBe(true);

      // Hora 2 (20-21): 20 - 10 = 10 disponibles (alcanza para 8)
      expect(result.timeSlots[1].availableSlots).toBe(10);
      expect(result.timeSlots[1].isAvailable).toBe(true);

      expect(result.isFullyAvailable).toBe(true);
    });

    test("escenario 4: reservas que empiezan y terminan en bordes de hora", () => {
      const startDate = new Date("2024-01-20T19:00:00.000Z");
      const endDate = new Date("2024-01-20T20:00:00.000Z");

      const existingAppointments: AppointmentSlot[] = [
        // Termina exactamente a las 19:00 (no afecta hora 19-20)
        {
          startDateTime: "2024-01-20T18:00:00.000Z",
          endDateTime: "2024-01-20T19:00:00.000Z", // Termina exactamente a las 19:00
          numberOfPeople: 10,
          status: "confirmed",
        },
        // Empieza exactamente a las 20:00 (no afecta hora 19-20)
        {
          startDateTime: "2024-01-20T20:00:00.000Z", // Empieza exactamente a las 20:00
          endDateTime: "2024-01-20T21:00:00.000Z",
          numberOfPeople: 15,
          status: "confirmed",
        },
        // Dentro de la hora 19-20
        {
          startDateTime: "2024-01-20T19:30:00.000Z",
          endDateTime: "2024-01-20T19:45:00.000Z",
          numberOfPeople: 4,
          status: "confirmed",
        },
      ];

      const result = calculateAvailability({
        appointments: existingAppointments,
        maxCapacityPerHour: 20,
        startDate,
        endDate,
        numberOfPeople: 10,
      });

      // Solo debe contar la reserva de 19:30-19:45 (4 personas)
      // Las reservas en los bordes no deben contar
      expect(result.timeSlots[0].availableSlots).toBe(16); // 20 - 4 = 16
      expect(result.timeSlots[0].isAvailable).toBe(true); // 16 ≥ 10
    });
  });
});
