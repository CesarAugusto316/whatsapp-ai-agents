import { renderMsgNotAvailable } from "@/domain/restaurant/reservations/render-msg-not-available";
import {
  formatLocalDateTime,
  utcToLocalDateTime,
} from "@/domain/utilities/datetime-formatting/datetime-converters";
import { describe, expect, test } from "bun:test";

const TIMEZONE = "America/Lima";

function formatTestDate(utcISO: string): string {
  const local = utcToLocalDateTime(utcISO, TIMEZONE);
  return formatLocalDateTime(local, TIMEZONE);
}

describe("renderMsgNotAvailable", () => {
  const baseBusiness = {
    _id: "test-business",
    general: {
      timezone: TIMEZONE,
      tables: 20,
    },
  };

  const baseData = {
    numberOfPeople: 4,
  };

  test("debería mostrar mensaje cuando no hay disponibilidad total", () => {
    const availability = {
      success: true,
      businessId: "test-id",
      requestedStart: "2026-01-10T16:00:00.000Z", // 11:00 am Lima
      requestedEnd: "2026-01-10T17:00:00.000Z", // 12:00 pm Lima
      requestedPeople: 4,
      totalCapacityPerHour: 20,
      availableSlotsPerHour: [
        {
          hour: "2026-01-10T16:00:00.000Z", // 11:00 am Lima
          availableSlots: 2,
          isAvailable: false,
        },
        {
          hour: "2026-01-10T17:00:00.000Z", // 12:00 pm Lima
          availableSlots: 0,
          isAvailable: false,
        },
      ],
      isFullyAvailable: false,
      suggestedTimes: [],
    };

    const result = renderMsgNotAvailable({
      availability,
      business: baseBusiness as any,
      data: baseData as any,
    });

    const startTime = formatTestDate("2026-01-10T16:00:00.000Z");
    const endTime = formatTestDate("2026-01-10T17:00:00.000Z");

    expect(result).toContain(
      "Lo sentimos, no hay disponibilidad para 4 personas",
    );
    expect(result).toContain(startTime);
    expect(result).toContain(endTime);
    // No debe contener los detalles que eliminamos
    expect(result).not.toContain("La capacidad máxima por hora");
    expect(result).not.toContain("Para tu grupo de 4 personas, necesitaríamos");
  });

  test("debería mostrar sugerencias cuando hay horarios alternativos", () => {
    const availability = {
      success: true,
      businessId: "test-id",
      requestedStart: "2026-01-10T16:00:00.000Z",
      requestedEnd: "2026-01-10T17:00:00.000Z",
      requestedPeople: 4,
      totalCapacityPerHour: 20,
      availableSlotsPerHour: [
        {
          hour: "2026-01-10T16:00:00.000Z",
          availableSlots: 0,
          isAvailable: false,
        },
      ],
      isFullyAvailable: false,
      suggestedTimes: [
        "2026-01-10T18:00:00.000Z", // 13:00 Lima
        "2026-01-10T19:00:00.000Z", // 14:00 Lima
        "2026-01-10T20:00:00.000Z", // 15:00 Lima
        "2026-01-10T21:00:00.000Z", // 16:00 Lima
        "2026-01-11T16:00:00.000Z", // 11:00 Lima del día siguiente
      ],
    };

    const result = renderMsgNotAvailable({
      availability,
      business: baseBusiness as any,
      data: baseData as any,
    });

    expect(result).toContain("✨ Te sugerimos estos horarios alternativos:");
    const firstSuggestion = formatTestDate("2026-01-10T18:00:00.000Z");
    expect(result).toContain(`1. ${firstSuggestion}`);
    expect(result).toContain("...y 1 opciones más");
  });

  test("debería manejar singular/plural correctamente", () => {
    const availability = {
      success: true,
      businessId: "test-id",
      requestedStart: "2026-01-10T16:00:00.000Z",
      requestedEnd: "2026-01-10T16:00:00.000Z",
      requestedPeople: 1,
      totalCapacityPerHour: 20,
      availableSlotsPerHour: [
        {
          hour: "2026-01-10T16:00:00.000Z",
          availableSlots: 1,
          isAvailable: false,
        },
      ],
      isFullyAvailable: false,
      suggestedTimes: [],
    };

    const result = renderMsgNotAvailable({
      availability,
      business: baseBusiness as any,
      data: { numberOfPeople: 1 } as any,
    });

    expect(result).toContain("para 1 persona");
    expect(result).not.toContain("hasta");
  });

  test("debería manejar caso con solo 1 horario sugerido", () => {
    const availability = {
      success: true,
      businessId: "test-id",
      requestedStart: "2026-01-10T16:00:00.000Z",
      requestedEnd: "2026-01-10T17:00:00.000Z",
      requestedPeople: 4,
      totalCapacityPerHour: 20,
      availableSlotsPerHour: [
        {
          hour: "2026-01-10T16:00:00.000Z",
          availableSlots: 0,
          isAvailable: false,
        },
      ],
      isFullyAvailable: false,
      suggestedTimes: ["2026-01-10T18:00:00.000Z"], // 13:00 Lima
    };

    const result = renderMsgNotAvailable({
      availability,
      business: baseBusiness as any,
      data: baseData as any,
    });

    const suggestionTime = formatTestDate("2026-01-10T18:00:00.000Z");
    expect(result).toContain("✨ Te sugerimos estos horarios alternativos:");
    expect(result).toContain(`1. ${suggestionTime}`);
    expect(result).not.toContain("...y"); // No debería mostrar si solo hay 1
  });

  test("debería mostrar correctamente cuando requestedStart y requestedEnd son iguales", () => {
    const availability = {
      success: true,
      businessId: "test-id",
      requestedStart: "2026-01-10T16:00:00.000Z",
      requestedEnd: "2026-01-10T16:00:00.000Z", // Misma hora
      requestedPeople: 4,
      totalCapacityPerHour: 20,
      availableSlotsPerHour: [
        {
          hour: "2026-01-10T16:00:00.000Z",
          availableSlots: 0,
          isAvailable: false,
        },
      ],
      isFullyAvailable: false,
      suggestedTimes: [],
    };

    const result = renderMsgNotAvailable({
      availability,
      business: baseBusiness as any,
      data: baseData as any,
    });

    // No debería contener "hasta" ya que es la misma hora
    expect(result).not.toContain("hasta");
  });

  // Tests simplificados para los demás escenarios

  test("debería manejar respuesta con múltiples horas no disponibles", () => {
    const availability = {
      success: true,
      businessId: "test-id",
      requestedStart: "2026-01-10T16:00:00.000Z", // 11:00 Lima
      requestedEnd: "2026-01-10T20:00:00.000Z", // 15:00 Lima
      requestedPeople: 10,
      totalCapacityPerHour: 30,
      availableSlotsPerHour: [
        {
          hour: "2026-01-10T16:00:00.000Z", // 11:00 Lima
          availableSlots: 5,
          isAvailable: false,
        },
        {
          hour: "2026-01-10T17:00:00.000Z", // 12:00 Lima
          availableSlots: 3,
          isAvailable: false,
        },
      ],
      isFullyAvailable: false,
      suggestedTimes: [],
    };

    const result = renderMsgNotAvailable({
      availability,
      business: baseBusiness as any,
      data: { numberOfPeople: 10 } as any,
    });

    expect(result).toContain(
      "Lo sentimos, no hay disponibilidad para 10 personas",
    );
    // No debe contener los detalles que eliminamos
    expect(result).not.toContain("faltan 5");
    expect(result).not.toContain("faltan 7");
  });

  test("debería manejar disponibilidad total (isFullyAvailable: true)", () => {
    const availability = {
      success: true,
      businessId: "test-id",
      requestedStart: "2026-01-10T16:00:00.000Z",
      requestedEnd: "2026-01-10T17:00:00.000Z",
      requestedPeople: 2,
      totalCapacityPerHour: 40,
      availableSlotsPerHour: [
        {
          hour: "2026-01-10T16:00:00.000Z",
          availableSlots: 40,
          isAvailable: true,
        },
      ],
      isFullyAvailable: true,
      suggestedTimes: [],
    };

    const result = renderMsgNotAvailable({
      availability,
      business: baseBusiness as any,
      data: { numberOfPeople: 2 } as any,
    });

    expect(result).toContain(
      "Lo sentimos, no hay disponibilidad para 2 personas",
    );
    // No debe contener "Sin embargo, tenemos disponibilidad" porque eliminamos esa lógica
    expect(result).not.toContain("Sin embargo, tenemos disponibilidad");
  });
});
