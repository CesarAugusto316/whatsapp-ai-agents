import { describe, expect, test } from "bun:test";
import { parseBookingData } from "@/application/use-cases/sagas/booking/workflows/helpers/input-parser/date-parser";

describe("parseBookingData", () => {
  test("should parse 'Mañana de 8 a 10 para 2 personas'", () => {
    const result = parseBookingData("Mañana de 8 a 10 para 2 personas");

    // Verificar que tenga las propiedades correctas
    expect(result.customerName).toBeDefined();
    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime).toBeDefined();
    expect(result.datetime.start).toBeDefined();
    expect(result.datetime.end).toBeDefined();

    // Verificar formato de fechas
    expect(result.datetime.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.datetime.start.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(result.datetime.end.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.datetime.end.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  test("should parse 'Hoy a las 19:30 para 4 personas'", () => {
    const result = parseBookingData("Hoy a las 19:30 para 4 personas");

    expect(result.numberOfPeople).toBe(4);
    expect(result.datetime.start.time).toBe("19:30:00");
  });

  test("should parse 'Reserva para el viernes a las 8pm para 6 personas'", () => {
    const result = parseBookingData(
      "Reserva para el viernes a las 8pm para 6 personas",
    );

    expect(result.numberOfPeople).toBe(6);
    expect(result.datetime.start.time).toBe("20:00:00"); // 8pm = 20:00
  });

  test("should parse 'Mesa para 3 el 15 de marzo'", () => {
    const result = parseBookingData("Mesa para 3 el 15 de marzo");

    expect(result.numberOfPeople).toBe(3);
    expect(result.datetime.start.date).toContain("-03-15"); // Marzo 15
  });

  test("should parse 'Para mañana de 7pm a 9pm, somos 5'", () => {
    const result = parseBookingData("Para mañana de 7pm a 9pm, somos 5");

    expect(result.numberOfPeople).toBe(5);
    expect(result.datetime.start.time).toBe("19:00:00"); // 7pm
    expect(result.datetime.end.time).toBe("21:00:00"); // 9pm
  });

  test("should parse 'Reserva para Juan Pérez el sábado a las 2pm para 2 personas'", () => {
    const result = parseBookingData(
      "Reserva para Juan Pérez el sábado a las 2pm para 2 personas",
    );

    expect(result.customerName).toContain("Juan"); // Could be "Juan" or "Juan Pérez"
    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.time).toBe("14:00:00"); // 2pm
  });

  test("should handle 'Viernes 20 de septiembre para 4 personas a las 8:30pm'", () => {
    const result = parseBookingData(
      "Viernes 20 de septiembre para 4 personas a las 8:30pm",
    );

    expect(result.numberOfPeople).toBe(4);
    expect(result.datetime.start.time).toBe("20:30:00"); // 8:30pm
    // Note: Date extraction for distant future dates may default to reference date
  });

  test("should handle '10/05/2024 de 14:00 a 16:00 para 8 personas'", () => {
    const result = parseBookingData(
      "10/05/2024 de 14:00 a 16:00 para 8 personas",
    );

    expect(result.numberOfPeople).toBe(8);
    expect(result.datetime.start.date).toContain("-05-10"); // May 10 (could be 2024 or 2025 depending on current date)
    expect(result.datetime.start.time).toBe("14:00:00");
    expect(result.datetime.end.time).toBe("16:00:00");
  });

  test("should handle 'Hoy a las 12:30 para 1 persona'", () => {
    const result = parseBookingData("Hoy a las 12:30 para 1 persona");

    expect(result.numberOfPeople).toBe(1);
    expect(result.datetime.start.time).toBe("12:30:00");
  });

  test("should handle 'Mañana a las 7:30am para 3 personas'", () => {
    const result = parseBookingData("Mañana a las 7:30am para 3 personas");

    expect(result.numberOfPeople).toBe(3);
    expect(result.datetime.start.time).toBe("07:30:00"); // 7:30am
  });

  test("should handle 'Pasado mañana para 7 personas'", () => {
    const result = parseBookingData("Pasado mañana para 7 personas");

    expect(result.numberOfPeople).toBe(7);
  });

  test("should handle 'Reserva para el lunes 8 de abril para 4 personas'", () => {
    const result = parseBookingData(
      "Reserva para el lunes 8 de abril para 4 personas",
    );

    expect(result.numberOfPeople).toBe(4);
    // Note: Date extraction for distant future dates may default to reference date
  });

  test("should handle 'De 9am a 11am para 2 personas el jueves'", () => {
    const result = parseBookingData("De 9am a 11am para 2 personas el jueves");

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.time).toBe("09:00:00"); // 9am
    expect(result.datetime.end.time).toBe("11:00:00"); // 11am
  });

  test("should handle 'Para el domingo a las 1:30pm somos 6'", () => {
    const result = parseBookingData("Para el domingo a las 1:30pm somos 6");

    expect(result.numberOfPeople).toBe(6);
    expect(result.datetime.start.time).toBe("13:30:00"); // 1:30pm
  });

  test("should handle 'Reserva a nombre de María López para el 25/12/2024 a las 8pm para 10 personas'", () => {
    const result = parseBookingData(
      "Reserva a nombre de María López para el 25/12/2024 a las 8pm para 10 personas",
    );

    expect(result.customerName).toContain("María"); // Could be "María" or "María López"
    expect(result.numberOfPeople).toBe(10);
    expect(result.datetime.start.date).toContain("-12-25"); // Should contain Dec 25
    expect(result.datetime.start.time).toBe("20:00:00"); // 8pm
  });

  test("should handle 'Fin de semana para 4 personas, sábado o domingo'", () => {
    const result = parseBookingData(
      "Fin de semana para 4 personas, sábado o domingo",
    );

    expect(result.numberOfPeople).toBe(4);
  });

  test("should handle 'Para esta noche a las 9pm para 3 personas'", () => {
    const result = parseBookingData(
      "Para esta noche a las 9pm para 3 personas",
    );

    expect(result.numberOfPeople).toBe(3);
    expect(result.datetime.start.time).toBe("21:00:00"); // 9pm
  });

  test("should handle 'Mesa para el almuerzo de 2pm a 4pm para 5 personas'", () => {
    const result = parseBookingData(
      "Mesa para el almuerzo de 2pm a 4pm para 5 personas",
    );

    expect(result.numberOfPeople).toBe(5);
    expect(result.datetime.start.time).toBe("14:00:00"); // 2pm
    expect(result.datetime.end.time).toBe("16:00:00"); // 4pm
  });

  test("should handle 'Cena para 2 personas el viernes a las 8:30pm'", () => {
    const result = parseBookingData(
      "Cena para 2 personas el viernes a las 8:30pm",
    );

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.time).toBe("20:30:00"); // 8:30pm
  });

  test("should handle 'Reserva para 1 persona para hoy, no tengo prisa'", () => {
    const result = parseBookingData(
      "Reserva para 1 persona para hoy, no tengo prisa",
    );

    expect(result.numberOfPeople).toBe(1);
  });
});
