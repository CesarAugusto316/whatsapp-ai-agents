import { describe, expect, test } from "bun:test";
import { parseBookingData } from "@/application/use-cases/sagas/booking/workflows/helpers/input-parser/date-parser";

// Helper functions for dynamic date calculations
function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getTomorrow(): Date {
  const today = getToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

function getDayAfterTomorrow(): Date {
  const today = getToday();
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  return dayAfterTomorrow;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD format
}

function getTime(timeString: string): string {
  // Convert time expressions to HH:mm:ss format
  if (timeString.includes("am") || timeString.includes("pm")) {
    const [time, modifier] = timeString.toLowerCase().split(/\s+/);
    let [hours, minutes = "00"] = time.split(":");

    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    if (h === 12) {
      h = 0;
    }

    if (modifier === "pm") {
      h += 12;
    }

    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
  }

  // If already in 24h format, pad with zeros if needed
  const [hours, minutes = "00", seconds = "00"] = timeString.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
}

function getNextWeekday(targetDay: number): Date {
  // targetDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const today = getToday();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  let daysUntilTarget = (targetDay - currentDay + 7) % 7;
  if (daysUntilTarget === 0) daysUntilTarget = 7; // If it's the same day, go to next week

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget);

  return targetDate;
}

function getFutureDate(month: number, day: number): Date {
  // Get current year
  const today = getToday();
  let targetDate = new Date(today.getFullYear(), month, day);

  // If the date already passed this year, use next year
  if (targetDate < today) {
    targetDate = new Date(today.getFullYear() + 1, month, day);
  }

  return targetDate;
}

describe("parseBookingData - Comprehensive Tests", () => {
  test("should parse 'Mañana de 8 a 10 para 2 personas'", () => {
    const result = parseBookingData("Mañana de 8 a 10 para 2 personas");

    // Verify that it has the correct properties
    expect(result.customerName).toBeDefined();
    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime).toBeDefined();
    expect(result.datetime.start).toBeDefined();
    expect(result.datetime.end).toBeDefined();

    // Verify date and time formats
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.datetime.start.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(result.datetime.end.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.datetime.end.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);

    // Verify semantic correctness: start time should be 8:00:00, end time should be 10:00:00
    expect(result.datetime.start.time).toBe("08:00:00");
    expect(result.datetime.end.time).toBe("10:00:00");

    // Verify that start and end dates should be the same (same day)
    expect(result.datetime.start.date).toBe(result.datetime.end.date);
  });

  test("should parse 'Hoy a las 19:30 para 4 personas'", () => {
    const result = parseBookingData("Hoy a las 19:30 para 4 personas");

    expect(result.numberOfPeople).toBe(4);
    expect(result.datetime.start.time).toBe("19:30:00");

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should parse 'Reserva para el viernes a las 8pm para 6 personas'", () => {
    const result = parseBookingData(
      "Reserva para el viernes a las 8pm para 6 personas",
    );

    expect(result.numberOfPeople).toBe(6);
    expect(result.datetime.start.time).toBe("20:00:00"); // 8pm = 20:00

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should parse 'Mesa para 3 el 15 de marzo'", () => {
    const result = parseBookingData("Mesa para 3 el 15 de marzo");

    expect(result.numberOfPeople).toBe(3);
    expect(result.datetime.start.date).toContain("-03-15"); // March 15

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should parse 'Para mañana de 7pm a 9pm, somos 5'", () => {
    const result = parseBookingData("Para mañana de 7pm a 9pm, somos 5");

    expect(result.numberOfPeople).toBe(5);
    expect(result.datetime.start.time).toBe("19:00:00"); // 7pm
    expect(result.datetime.end.time).toBe("21:00:00"); // 9pm

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.datetime.end.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Verify that start and end dates should be the same (same day)
    expect(result.datetime.start.date).toBe(result.datetime.end.date);
  });

  test("should parse 'Reserva para Juan Pérez el sábado a las 2pm para 2 personas'", () => {
    const result = parseBookingData(
      "Reserva para Juan Pérez el sábado a las 2pm para 2 personas",
    );

    expect(result.customerName).toContain("Juan"); // Could be "Juan" or "Juan Pérez"
    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.time).toBe("14:00:00"); // 2pm

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Viernes 20 de septiembre para 4 personas a las 8:30pm'", () => {
    const result = parseBookingData(
      "Viernes 20 de septiembre para 4 personas a las 8:30pm",
    );

    expect(result.numberOfPeople).toBe(4);
    expect(result.datetime.start.time).toBe("20:30:00"); // 8:30pm
    expect(result.datetime.start.date).toContain("-09-20"); // September 20

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle '10/05/2024 de 14:00 a 16:00 para 8 personas'", () => {
    const result = parseBookingData(
      "10/05/2024 de 14:00 a 16:00 para 8 personas",
    );

    expect(result.numberOfPeople).toBe(8);
    expect(result.datetime.start.date).toContain("-05-10"); // May 10
    expect(result.datetime.start.time).toBe("14:00:00");
    expect(result.datetime.end.time).toBe("16:00:00");

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.datetime.end.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Hoy a las 12:30 para 1 persona'", () => {
    const result = parseBookingData("Hoy a las 12:30 para 1 persona");

    expect(result.numberOfPeople).toBe(1);
    expect(result.datetime.start.time).toBe("12:30:00");

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Mañana a las 7:30am para 3 personas'", () => {
    const result = parseBookingData("Mañana a las 7:30am para 3 personas");

    expect(result.numberOfPeople).toBe(3);
    expect(result.datetime.start.time).toBe("07:30:00"); // 7:30am

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Pasado mañana para 7 personas'", () => {
    const result = parseBookingData("Pasado mañana para 7 personas");

    expect(result.numberOfPeople).toBe(7);

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Reserva para el lunes 8 de abril para 4 personas'", () => {
    const result = parseBookingData(
      "Reserva para el lunes 8 de abril para 4 personas",
    );

    expect(result.numberOfPeople).toBe(4);
    expect(result.datetime.start.date).toContain("-04-08"); // April 8

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'De 9am a 11am para 2 personas el jueves'", () => {
    const result = parseBookingData("De 9am a 11am para 2 personas el jueves");

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.time).toBe("09:00:00"); // 9am
    expect(result.datetime.end.time).toBe("11:00:00"); // 11am

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.datetime.end.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Verify that start and end dates should be the same (same day)
    expect(result.datetime.start.date).toBe(result.datetime.end.date);
  });

  test("should handle 'Para el domingo a las 1:30pm somos 6'", () => {
    const result = parseBookingData("Para el domingo a las 1:30pm somos 6");

    expect(result.numberOfPeople).toBe(6);
    expect(result.datetime.start.time).toBe("13:30:00"); // 1:30pm

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Reserva a nombre de María López para el 25/12/2024 a las 8pm para 10 personas'", () => {
    const result = parseBookingData(
      "Reserva a nombre de María López para el 25/12/2024 a las 8pm para 10 personas",
    );

    expect(result.customerName).toContain("María"); // Could be "María" or "María López"
    expect(result.numberOfPeople).toBe(10);
    expect(result.datetime.start.date).toContain("-12-25"); // Should contain Dec 25
    expect(result.datetime.start.time).toBe("20:00:00"); // 8pm

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Para esta noche a las 9pm para 3 personas'", () => {
    const result = parseBookingData(
      "Para esta noche a las 9pm para 3 personas",
    );

    expect(result.numberOfPeople).toBe(3);
    expect(result.datetime.start.time).toBe("21:00:00"); // 9pm

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Mesa para el almuerzo de 2pm a 4pm para 5 personas'", () => {
    const result = parseBookingData(
      "Mesa para el almuerzo de 2pm a 4pm para 5 personas",
    );

    expect(result.numberOfPeople).toBe(5);
    expect(result.datetime.start.time).toBe("14:00:00"); // 2pm
    expect(result.datetime.end.time).toBe("16:00:00"); // 4pm

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.datetime.end.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Verify that start and end dates should be the same (same day)
    expect(result.datetime.start.date).toBe(result.datetime.end.date);
  });

  test("should handle 'Cena para 2 personas el viernes a las 8:30pm'", () => {
    const result = parseBookingData(
      "Cena para 2 personas el viernes a las 8:30pm",
    );

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.time).toBe("20:30:00"); // 8:30pm

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Reserva para 1 persona para hoy, no tengo prisa'", () => {
    const result = parseBookingData(
      "Reserva para 1 persona para hoy, no tengo prisa",
    );

    expect(result.numberOfPeople).toBe(1);

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Reserva para el próximo viernes a las 7pm para 4 personas'", () => {
    const result = parseBookingData(
      "Reserva para el próximo viernes a las 7pm para 4 personas",
    );

    expect(result.numberOfPeople).toBe(4);
    expect(result.datetime.start.time).toBe("19:00:00"); // 7pm

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Mesa para el martes 17 de marzo a las 8:30pm para 6 personas'", () => {
    const result = parseBookingData(
      "Mesa para el martes 17 de marzo a las 8:30pm para 6 personas",
    );

    expect(result.numberOfPeople).toBe(6);
    expect(result.datetime.start.time).toBe("20:30:00"); // 8:30pm
    expect(result.datetime.start.date).toContain("-03-17"); // March 17

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Cena para 3 personas el domingo 22 de marzo de 2026 a las 8pm'", () => {
    const result = parseBookingData(
      "Cena para 3 personas el domingo 22 de marzo de 2026 a las 8pm",
    );

    expect(result.numberOfPeople).toBe(3);
    expect(result.datetime.start.time).toBe("20:00:00"); // 8pm
    expect(result.datetime.start.date).toBe("2026-03-22"); // March 22, 2026

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("should handle 'Reserva para sábado 4 de abril para 5 personas de 7pm a 10pm'", () => {
    const result = parseBookingData(
      "Reserva para sábado 4 de abril para 5 personas de 7pm a 10pm",
    );

    expect(result.numberOfPeople).toBe(5);
    expect(result.datetime.start.time).toBe("19:00:00"); // 7pm
    expect(result.datetime.end.time).toBe("22:00:00"); // 10pm
    expect(result.datetime.start.date).toContain("-04-04"); // April 4

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.datetime.end.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Verify that start and end dates should be the same (same day)
    expect(result.datetime.start.date).toBe(result.datetime.end.date);
  });

  test("should handle 'Almuerzo para 2 personas el lunes 30 de marzo a las 1:30pm'", () => {
    const result = parseBookingData(
      "Almuerzo para 2 personas el lunes 30 de marzo a las 1:30pm",
    );

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.time).toBe("13:30:00"); // 1:30pm
    expect(result.datetime.start.date).toContain("-03-30"); // March 30

    // Verify date format
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
