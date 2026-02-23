import { describe, it, expect } from "bun:test";
import {
  bookingStateManager,
  DOMAIN_ACTION_CONFIG,
} from "@/application/services/state-managers";
import {
  MainOptions,
  BookingStatuses,
  CustomerSignals,
} from "@/domain/booking";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";

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
// Domain configs explícitas para tests (single source of truth)
// ─────────────────────────────────────────────────────────────────────────────

const RESTAURANT_CREATE = DOMAIN_ACTION_CONFIG.restaurant.create;
const RESTAURANT_UPDATE = DOMAIN_ACTION_CONFIG.restaurant.update;
const RESTAURANT_CANCEL = DOMAIN_ACTION_CONFIG.restaurant.cancel;

const MEDICAL_CREATE = DOMAIN_ACTION_CONFIG.medical.create;
const REAL_ESTATE_CREATE = DOMAIN_ACTION_CONFIG["real-estate"].create;

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("BookingStateManager.nextState()", () => {
  describe("CREATE flow", () => {
    it("MAKE_BOOKING → MAKE_STARTED (sin nombre)", () => {
      const result = bookingStateManager.nextState(MainOptions.MAKE_BOOKING, {
        domain: "restaurant" satisfies SpecializedDomain,
      });

      expect(result.nextState).toBe(BookingStatuses.MAKE_STARTED);
      expect(result.message).toContain(RESTAURANT_CREATE.verbInfinitive);
      expect(result.message).toContain(RESTAURANT_CREATE.title);
      expect(result.message).toContain(mockBookingData.customerName);
    });

    it("MAKE_BOOKING → MAKE_STARTED (con nombre)", () => {
      const result = bookingStateManager.nextState(MainOptions.MAKE_BOOKING, {
        domain: "restaurant" satisfies SpecializedDomain,
        data: { customerName: "Juan Pérez" },
      });

      expect(result.nextState).toBe(BookingStatuses.MAKE_STARTED);
      expect(result.message).toContain(RESTAURANT_CREATE.verbInfinitive);
      expect(result.message).toContain(RESTAURANT_CREATE.title);
      expect(result.message).not.toContain(mockBookingData.customerName);
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
      expect(result.message).toContain(RESTAURANT_CREATE.process);
      expect(result.message).toContain(RESTAURANT_CREATE.title);
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
      expect(result.message).toContain(RESTAURANT_CREATE.verb);
      expect(result.message).toContain("María Rodríguez");
      expect(result.message).toContain(mockBookingData.id);
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
      expect(result.message).toContain(RESTAURANT_UPDATE.verbInfinitive);
      expect(result.message).toContain(RESTAURANT_UPDATE.title);
    });
  });

  describe("UPDATE flow", () => {
    it("UPDATE_BOOKING → UPDATE_STARTED", () => {
      const result = bookingStateManager.nextState(MainOptions.UPDATE_BOOKING, {
        domain: "restaurant" satisfies SpecializedDomain,
        data: mockBookingData,
        timeZone: mockTimeZone,
      });

      expect(result.nextState).toBe(BookingStatuses.UPDATE_STARTED);
      expect(result.message).toContain(RESTAURANT_UPDATE.title);
      expect(result.message).toContain(mockBookingData.customerName);
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
      expect(result.message).toContain(RESTAURANT_UPDATE.process);
      expect(result.message).toContain(RESTAURANT_UPDATE.title);
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
      expect(result.message).toContain(RESTAURANT_UPDATE.verb);
      expect(result.message).toContain(mockBookingData.customerName);
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
      expect(result.message).toContain(RESTAURANT_UPDATE.verbInfinitive);
      expect(result.message).toContain(RESTAURANT_UPDATE.title);
    });
  });

  describe("CANCEL flow", () => {
    it("CANCEL_BOOKING → CANCEL_VALIDATED", () => {
      const result = bookingStateManager.nextState(MainOptions.CANCEL_BOOKING, {
        domain: "restaurant" satisfies SpecializedDomain,
        data: mockBookingData,
        timeZone: mockTimeZone,
      });

      expect(result.nextState).toBe(BookingStatuses.CANCEL_VALIDATED);
      expect(result.message).toContain(RESTAURANT_CANCEL.title);
      expect(result.message).toContain(CustomerSignals.CONFIRM);
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
      expect(result.message).toContain(RESTAURANT_CANCEL.verb);
      expect(result.message).toContain("Esperamos verte pronto");
    });
  });

  describe("Domain configuration", () => {
    it("usa 'restaurant' como domain por defecto", () => {
      const result = bookingStateManager.nextState(MainOptions.MAKE_BOOKING);

      expect(result.nextState).toBe(BookingStatuses.MAKE_STARTED);
      expect(result.message).toContain(RESTAURANT_CREATE.verbInfinitive);
      expect(result.message).toContain(RESTAURANT_CREATE.title);
    });

    it("soporta dominio 'medical'", () => {
      const result = bookingStateManager.nextState(MainOptions.MAKE_BOOKING, {
        domain: "medical" satisfies SpecializedDomain,
      });

      expect(result.message).toContain(MEDICAL_CREATE.verbInfinitive);
      expect(result.message).toContain(MEDICAL_CREATE.title);
    });

    it("soporta dominio 'real-estate'", () => {
      const result = bookingStateManager.nextState(MainOptions.MAKE_BOOKING, {
        domain: "real-estate" satisfies SpecializedDomain,
      });

      expect(result.message).toContain(REAL_ESTATE_CREATE.verbInfinitive);
      expect(result.message).toContain(REAL_ESTATE_CREATE.title);
    });

    it("verifica que el mensaje contenga verb y title explícitos", () => {
      const result = bookingStateManager.nextState(
        BookingStatuses.MAKE_VALIDATED + CustomerSignals.CONFIRM,
        {
          domain: "restaurant" satisfies SpecializedDomain,
          data: mockBookingData,
          timeZone: mockTimeZone,
        },
      );

      // Verifica palabras clave explícitas de DOMAIN_ACTION_CONFIG
      expect(result.message).toContain(RESTAURANT_CREATE.verb);
      expect(result.message).toContain(RESTAURANT_CREATE.title);
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
