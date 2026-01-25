import { AvailabilityResponse } from "@/collections/appointments/check-availability";
import { describe, expect, test } from "bun:test";

const BASE_URL = "http://192.168.1.3:3001";
const TEST_BUSINESS_ID = "71358eb4-b61e-418d-a2fe-e34b8e5c5e6c";

describe("Endpoint de verificación de disponibilidad", () => {
  describe("GET /api/appointments/check-availability", () => {
    test("debe retornar 200 OK con parámetros válidos", async () => {
      const url = new URL(`${BASE_URL}/api/appointments/check-availability`);
      url.searchParams.append("depth", "0");
      url.searchParams.append("where[business][equals]", TEST_BUSINESS_ID);
      url.searchParams.append(
        "where[startDateTime][equals]",
        "2026-01-10T16:00:00.000Z",
      );
      url.searchParams.append(
        "where[endDateTime][equals]",
        "2026-01-10T17:00:00.000Z",
      );
      url.searchParams.append("where[numberOfPeople][equals]", "2");

      const response = await fetch(url.toString());
      expect(response.status).toBe(200);

      const data: AvailabilityResponse = await response.json();
      expect(data.success).toBe(true);
      expect(data.businessId).toBe(TEST_BUSINESS_ID);
      expect(data.requestedStart).toBe("2026-01-10T16:00:00.000Z");
      expect(data.requestedEnd).toBe("2026-01-10T17:00:00.000Z");
      expect(data.requestedPeople).toBe(2);
      expect(data.totalCapacityPerHour).toBeGreaterThan(0);
      // expect(Array.isArray(data.overlappingSlots)).toBe(true);
      expect(typeof data.isRequestedDateTimeAvailable).toBe("boolean");
      expect(data.timeWindow).toBeDefined();
    });

    test("debe usar 1 hora por defecto cuando no se proporciona endDateTime", async () => {
      const url = new URL(`${BASE_URL}/api/appointments/check-availability`);
      url.searchParams.append("depth", "0");
      url.searchParams.append("where[business][equals]", TEST_BUSINESS_ID);
      url.searchParams.append(
        "where[startDateTime][equals]",
        "2026-01-10T16:00:00.000Z",
      );
      url.searchParams.append("where[numberOfPeople][equals]", "2");

      const response = await fetch(url.toString());
      expect(response.status).toBe(200);

      const data: AvailabilityResponse = await response.json();
      expect(data.success).toBe(true);

      // Verificar que el endDateTime calculado sea 1 hora después del startDateTime
      const startDate = new Date(data.requestedStart);
      const endDate = new Date(data.requestedEnd);
      const diffInHours =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      expect(diffInHours).toBe(1);
    });

    test("debe retornar 400 cuando falta businessId", async () => {
      const url = new URL(`${BASE_URL}/api/appointments/check-availability`);
      url.searchParams.append("depth", "0");
      url.searchParams.append(
        "where[startDateTime][equals]",
        "2026-01-10T16:00:00.000Z",
      );
      url.searchParams.append("where[numberOfPeople][equals]", "2");

      const response = await fetch(url.toString());
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain("businessId");
    });

    test("debe retornar 400 cuando falta startDateTime", async () => {
      const url = new URL(`${BASE_URL}/api/appointments/check-availability`);
      url.searchParams.append("depth", "0");
      url.searchParams.append("where[business][equals]", TEST_BUSINESS_ID);
      url.searchParams.append("where[numberOfPeople][equals]", "2");

      const response = await fetch(url.toString());
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain("startDateTime");
    });

    test("debe retornar 404 cuando el negocio no existe", async () => {
      const url = new URL(`${BASE_URL}/api/appointments/check-availability`);
      url.searchParams.append("depth", "0");
      url.searchParams.append(
        "where[business][equals]",
        "00000000-0000-0000-0000-000000000000",
      );
      url.searchParams.append(
        "where[startDateTime][equals]",
        "2026-01-10T16:00:00.000Z",
      );
      url.searchParams.append("where[numberOfPeople][equals]", "2");

      const response = await fetch(url.toString());
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain("Negocio no encontrado");
    });

    test("debe calcular correctamente la disponibilidad por hora", async () => {
      const url = new URL(`${BASE_URL}/api/appointments/check-availability`);
      url.searchParams.append("depth", "0");
      url.searchParams.append("where[business][equals]", TEST_BUSINESS_ID);
      url.searchParams.append(
        "where[startDateTime][equals]",
        "2026-01-10T16:00:00.000Z",
      );
      url.searchParams.append(
        "where[endDateTime][equals]",
        "2026-01-10T18:00:00.000Z",
      ); // 2 horas
      url.searchParams.append("where[numberOfPeople][equals]", "2");

      const response = await fetch(url.toString());
      expect(response.status).toBe(200);

      const data: AvailabilityResponse = await response.json();
      expect(data.overlappingSlots).toHaveLength(2); // 16-17 y 17-18

      // Cada slot debe tener la estructura correcta
      data.overlappingSlots.forEach((slot) => {
        expect(slot).toHaveProperty("startDateTime");
        expect(slot).toHaveProperty("reservedSlots");
        expect(slot).toHaveProperty("isReserved");
        expect(typeof slot.startDateTime).toBe("string");
        // expect(typeof slot.reservedSlots).toBe("number");
        // expect(typeof slot.isReserved).toBe("boolean");

        // Verificar que la hora sea válida
        expect(() => new Date(slot.startDateTime)).not.toThrow();
      });

      // isFullyAvailable debe ser consistente con los slots individuales
      // const allAvailable = data.reservedSlotsPerHour.every(
      //   (slot) => slot.isReserved,
      // );
      // expect(data.isFullyAvailable).toBe(allAvailable);
    });

    test("debe manejar intervalos de tiempo que cruzan horas", async () => {
      const url = new URL(`${BASE_URL}/api/appointments/check-availability`);
      url.searchParams.append("depth", "0");
      url.searchParams.append("where[business][equals]", TEST_BUSINESS_ID);
      url.searchParams.append(
        "where[startDateTime][equals]",
        "2026-01-10T16:30:00.000Z",
      );
      url.searchParams.append(
        "where[endDateTime][equals]",
        "2026-01-10T17:45:00.000Z",
      );
      url.searchParams.append("where[numberOfPeople][equals]", "2");

      const response = await fetch(url.toString());
      expect(response.status).toBe(200);

      const data: AvailabilityResponse = await response.json();

      // Debería normalizar a horas completas (16:30 → 16:00, 17:45 → 18:00)
      // Por lo tanto debería haber slots para 16-17 y 17-18
      expect(data.overlappingSlots.length).toBeGreaterThanOrEqual(2);
    });

    test("debe incluir tiempos sugeridos cuando no hay disponibilidad", async () => {
      // Primero, crear una reserva que consuma toda la capacidad
      // Nota: Este test puede fallar si no hay reservas existentes
      // Es más una prueba conceptual que debería funcionar en un entorno controlado
      const url = new URL(`${BASE_URL}/api/appointments/check-availability`);
      url.searchParams.append("depth", "0");
      url.searchParams.append("where[business][equals]", TEST_BUSINESS_ID);
      url.searchParams.append(
        "where[startDateTime][equals]",
        "2026-01-10T16:00:00.000Z",
      );
      url.searchParams.append("where[numberOfPeople][equals]", "1000"); // Número muy grande

      const response = await fetch(url.toString());
      expect(response.status).toBe(200);

      const data: AvailabilityResponse = await response.json();

      // Si no hay disponibilidad, podría sugerir horarios alternativos
      expect(data.timeWindow).toBeDefined();
      if (data.timeWindow && data.timeWindow.length > 0) {
        data.timeWindow.forEach((time) => {
          // expect(() => new Date(time)).not.toThrow();
        });
      }
    });

    test("debe manejar diferentes números de personas", async () => {
      const testCases = [1, 2, 5, 10];

      for (const numberOfPeople of testCases) {
        const url = new URL(`${BASE_URL}/api/appointments/check-availability`);
        url.searchParams.append("depth", "0");
        url.searchParams.append("where[business][equals]", TEST_BUSINESS_ID);
        url.searchParams.append(
          "where[startDateTime][equals]",
          "2026-01-10T16:00:00.000Z",
        );
        url.searchParams.append(
          "where[numberOfPeople][equals]",
          numberOfPeople.toString(),
        );

        const response = await fetch(url.toString());
        expect(response.status).toBe(200);

        const data: AvailabilityResponse = await response.json();
        expect(data.requestedPeople).toBe(numberOfPeople);

        // isAvailable debe ser consistente con availableSlots y numberOfPeople
        // data.reservedSlotsPerHour.forEach((slot) => {
        //   if (slot.isReserved) {
        //     expect(slot.reservedSlots).toBeGreaterThanOrEqual(numberOfPeople);
        //   } else {
        //     expect(slot.reservedSlots).toBeLessThan(numberOfPeople);
        //   }
        // });
      }
    });
  });

  describe("Validación de estructura de respuesta", () => {
    test("la respuesta debe tener la estructura correcta", async () => {
      const url = new URL(`${BASE_URL}/api/appointments/check-availability`);
      url.searchParams.append("depth", "0");
      url.searchParams.append("where[business][equals]", TEST_BUSINESS_ID);
      url.searchParams.append(
        "where[startDateTime][equals]",
        "2026-01-10T16:00:00.000Z",
      );
      url.searchParams.append("where[numberOfPeople][equals]", "2");

      const response = await fetch(url.toString());
      const data = await response.json();

      // Propiedades requeridas
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("businessId");
      expect(data).toHaveProperty("requestedStart");
      expect(data).toHaveProperty("requestedEnd");
      expect(data).toHaveProperty("totalCapacityPerHour");
      expect(data).toHaveProperty("availableSlotsPerHour");
      expect(data).toHaveProperty("isFullyAvailable");

      // Tipos correctos
      expect(typeof data.success).toBe("boolean");
      expect(typeof data.businessId).toBe("string");
      expect(typeof data.requestedStart).toBe("string");
      expect(typeof data.requestedEnd).toBe("string");
      expect(typeof data.totalCapacityPerHour).toBe("number");
      expect(Array.isArray(data.availableSlotsPerHour)).toBe(true);
      expect(typeof data.isFullyAvailable).toBe("boolean");

      // Validar estructura de availableSlotsPerHour
      if (data.availableSlotsPerHour.length > 0) {
        const slot = data.availableSlotsPerHour[0];
        expect(slot).toHaveProperty("startDateTime");
        expect(slot).toHaveProperty("reservedSlots");
        expect(slot).toHaveProperty("isReserved");
        expect(typeof slot.startDateTime).toBe("string");
        expect(typeof slot.reservedSlots).toBe("number");
        expect(typeof slot.isReserved).toBe("boolean");
      }

      // Propiedades opcionales
      if (data.requestedPeople !== undefined) {
        expect(typeof data.requestedPeople).toBe("number");
      }
      if (data.suggestedTimes !== undefined) {
        expect(Array.isArray(data.suggestedTimes)).toBe(true);
      }
      if (data.message !== undefined) {
        expect(typeof data.message).toBe("string");
      }
    });
  });
});
