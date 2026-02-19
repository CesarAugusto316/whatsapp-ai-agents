import { describe, it, expect } from "bun:test";
import {
  bookingStateManager,
  DOMAIN_ACTION_CONFIG,
} from "@/application/services/state-managers";
import {
  BookingOptions,
  BookingStatuses,
  CustomerSignals,
} from "@/domain/booking";
import type { SpecializedDomain } from "@/infraestructure/adapters/cms";

// ─────────────────────────────────────────────────────────────────────────────
// Test data helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockBookingData = {
  id: "123",
  customerName: "María Rodríguez",
  numberOfPeople: 4,
  datetime: {
    start: { date: "2025-01-15", time: "20:00" },
    end: { date: "2025-01-15", time: "22:00" },
  },
};

const mockTimeZone = "America/Mexico_City";

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("BookingStateManager.nextState()", () => {
  describe("CREATE flow", () => {
    it("MAKE_BOOKING → MAKE_STARTED (sin nombre)", () => {
      const result = bookingStateManager.nextState(
        BookingOptions.MAKE_BOOKING,
        {
          domain: "restaurant" satisfies SpecializedDomain,
        },
      );

      expect(result.nextState).toBe(BookingStatuses.MAKE_STARTED);
      expect(result.message).toContain("crear tu reserva");
      expect(result.message).toContain("tu nombre");
    });

    it("MAKE_BOOKING → MAKE_STARTED (con nombre)", () => {
      const result = bookingStateManager.nextState(
        BookingOptions.MAKE_BOOKING,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: { customerName: "Juan Pérez" },
        },
      );

      expect(result.nextState).toBe(BookingStatuses.MAKE_STARTED);
      expect(result.message).toContain("crear tu reserva");
      expect(result.message).not.toContain("tu nombre");
      expect(result.message).toContain("comentame");
    });

    it("MAKE_STARTED → MAKE_VALIDATED", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.MAKE_STARTED,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      expect(result.nextState).toBe(BookingStatuses.MAKE_VALIDATED);
      expect(result.message).toContain("Ya tenemos las datos listos");
      expect(result.message).toContain("CONFIRMADO que hay disponibilidad");
      expect(result.message).toContain(CustomerSignals.CONFIRM);
      expect(result.message).toContain(CustomerSignals.RESTART);
      expect(result.message).toContain(CustomerSignals.EXIT);
    });

    it("MAKE_VALIDATED + CONFIRMAR → MAKE_CONFIRMED (éxito)", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.MAKE_VALIDATED + CustomerSignals.CONFIRM,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      expect(result.nextState).toBe(BookingStatuses.MAKE_CONFIRMED);
      expect(result.message).toContain("ha sido creada con éxito");
      expect(result.message).toContain("María Rodríguez");
      expect(result.message).toContain("123");
    });

    it("MAKE_VALIDATED + SALIR → exit (nextState undefined)", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.MAKE_VALIDATED + CustomerSignals.EXIT,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      expect(result.nextState).toBeUndefined();
      expect(result.message).toContain("Gracias por usar nuestro servicio");
    });

    it("MAKE_VALIDATED + REINGRESAR → MAKE_STARTED (restart)", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.MAKE_VALIDATED + CustomerSignals.RESTART,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      expect(result.nextState).toBe(BookingStatuses.MAKE_STARTED);
      expect(result.message).toContain("actualizar tu reserva");
    });
  });

  describe("UPDATE flow", () => {
    it("UPDATE_BOOKING → UPDATE_STARTED", () => {
      const result = bookingStateManager.nextState(
        BookingOptions.UPDATE_BOOKING,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      expect(result.nextState).toBe(BookingStatuses.UPDATE_STARTED);
      expect(result.message).toContain("Hemos encontrado tu más reciente");
      expect(result.message).toContain("María Rodríguez");
    });

    it("UPDATE_STARTED → UPDATE_VALIDATED", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.UPDATE_STARTED,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      expect(result.nextState).toBe(BookingStatuses.UPDATE_VALIDATED);
      expect(result.message).toContain("Ya tenemos las datos listos");
      expect(result.message).toContain("actualización");
    });

    it("UPDATE_VALIDATED + CONFIRMAR → UPDATE_CONFIRMED (éxito)", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.UPDATE_VALIDATED + CustomerSignals.CONFIRM,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      expect(result.nextState).toBe(BookingStatuses.UPDATE_CONFIRMED);
      expect(result.message).toContain("ha sido actualizada con éxito");
      expect(result.message).toContain("María Rodríguez");
    });

    it("UPDATE_VALIDATED + SALIR → exit (nextState undefined)", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.UPDATE_VALIDATED + CustomerSignals.EXIT,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      expect(result.nextState).toBeUndefined();
      expect(result.message).toContain("Gracias por usar nuestro servicio");
    });

    it("UPDATE_VALIDATED + REINGRESAR → UPDATE_STARTED (restart)", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.UPDATE_VALIDATED + CustomerSignals.RESTART,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      expect(result.nextState).toBe(BookingStatuses.UPDATE_STARTED);
      expect(result.message).toContain("actualizar tu reserva");
    });
  });

  describe("CANCEL flow", () => {
    it("CANCEL_BOOKING → CANCEL_VALIDATED", () => {
      const result = bookingStateManager.nextState(
        BookingOptions.CANCEL_BOOKING,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      expect(result.nextState).toBe(BookingStatuses.CANCEL_VALIDATED);
      expect(result.message).toContain("Hemos encontrado tu más reciente");
      expect(result.message).toContain("Si deseas cancelarla");
    });

    it("CANCEL_VALIDATED + CONFIRMAR → CANCEL_CONFIRMED (éxito)", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.CANCEL_VALIDATED + CustomerSignals.CONFIRM,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
        },
      );

      expect(result.nextState).toBe(BookingStatuses.CANCEL_CONFIRMED);
      expect(result.message).toContain("ha sido cancelada con éxito");
      expect(result.message).toContain("Esperamos verte pronto");
    });
  });

  describe("Domain configuration", () => {
    it("usa 'restaurant' como domain por defecto", () => {
      const result = bookingStateManager.nextState(BookingOptions.MAKE_BOOKING);

      expect(result.nextState).toBe(BookingStatuses.MAKE_STARTED);
      expect(result.message).toContain("crear tu reserva");
    });

    it("soporta dominio 'medical'", () => {
      const result = bookingStateManager.nextState(
        BookingOptions.MAKE_BOOKING,
        {
          domain: "medical" satisfies SpecializedDomain,
        },
      );

      expect(result.message).toContain("agendar");
      expect(result.message).toContain("cita");
    });

    it("soporta dominio 'real-estate'", () => {
      const result = bookingStateManager.nextState(
        BookingOptions.MAKE_BOOKING,
        {
          domain: "real-estate" satisfies SpecializedDomain,
        },
      );

      expect(result.message).toContain("agendar");
      expect(result.message).toContain("visita");
    });

    it("verifica que el mensaje contenga action, verb, process, title", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.MAKE_VALIDATED + CustomerSignals.CONFIRM,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      // Verifica palabras clave de DOMAIN_ACTION_CONFIG
      expect(result.message).toMatch(/(creada|actualizada|cancelada)/); // verb
      expect(result.message).toMatch(/(reserva|cita|visita|consulta)/); // title
    });
  });

  describe("Default case", () => {
    it("estado desconocido → mantiene el estado y mensaje vacío", () => {
      const result = bookingStateManager.nextState("UNKNOWN_STATUS", {
        domain: "restaurant" satisfies SpecializedDomain,
      });

      expect(result.nextState).toBe("UNKNOWN_STATUS" as any);
      expect(result.message).toBe("");
    });
  });
});
