import { describe, expect, test } from "bun:test";
import { parseBookingData } from "@/application/use-cases/sagas/booking/workflows/helpers/input-parser/date-parser";
import {
  getNextWeekday,
  formatDateUTC,
  getDateForDayAndMonth,
} from "./date-parser-data";

describe("parseBookingData - Regional Expressions with Exact Validation", () => {
  test("should handle Mexican expressions: 'Orale, ¿tienen disponible para 4 chamacos el viernes a las 8pm?'", () => {
    const result = parseBookingData(
      "Orale, ¿tienen disponible para 4 chamacos el viernes a las 8pm?",
    );

    expect(result.numberOfPeople).toBe(4);
    expect(result.datetime.start.time).toBe("20:00:00"); // 8pm
  });

  test("should handle Mexican expressions: 'Jalamos pa' 2 güeyes el lunes'", () => {
    const result = parseBookingData("Jalamos pa' 2 güeyes el lunes");

    expect(result.numberOfPeople).toBe(2);
  });

  test("should handle Colombian expressions: '¿Parce, tienen pa' 4 pelados el jueves?'", () => {
    const result = parseBookingData("¿Parce, tienen pa' 4 pelados el jueves?");

    expect(result.numberOfPeople).toBe(4);
  });

  test("should handle Colombian expressions: 'Vamos pa' 2 el sábado parce'", () => {
    const result = parseBookingData("Vamos pa' 2 el sábado parce");

    expect(result.numberOfPeople).toBe(2);
  });

  test("should handle Argentinian expressions: '¿Tenés lugar pa' 4 fiambres?'", () => {
    const result = parseBookingData("¿Tenés lugar pa' 4 fiambres?");

    expect(result.numberOfPeople).toBe(4);
  });

  test("should handle Argentinian expressions: 'Somos 2 quilombos pa' hoy'", () => {
    const result = parseBookingData("Somos 2 quilombos pa' hoy");
    const expectedDate = formatDateUTC(new Date());

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.date).toBe(expectedDate);
  });

  test("should handle Spanish expressions: '¿Tienen sitio pa' 4 colegas?'", () => {
    const result = parseBookingData("¿Tienen sitio pa' 4 colegas?");

    expect(result.numberOfPeople).toBe(4);
  });

  test("should handle Spanish expressions: 'Pa' 3 compis el domingo'", () => {
    const result = parseBookingData("Pa' 3 compis el domingo");
    const expectedDate = formatDateUTC(getNextWeekday("domingo"));

    expect(result.numberOfPeople).toBe(3);
    expect(result.datetime.start.date).toBe(expectedDate);
  });

  test("should handle Peruvian expressions: '¿Tienen cupo pa' 4 compadres?'", () => {
    const result = parseBookingData("¿Tienen cupo pa' 4 compadres?");

    expect(result.numberOfPeople).toBe(4);
  });

  test("should handle Peruvian expressions: 'Vamos pa' 2 el jueves hermano'", () => {
    const result = parseBookingData("Vamos pa' 2 el jueves hermano");
    const expectedDate = formatDateUTC(getNextWeekday("jueves"));

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.date).toBe(expectedDate);
  });

  test("should handle Ecuadorian expressions: '¿Tienen rato pa' 4 compadres?'", () => {
    const result = parseBookingData("¿Tienen rato pa' 4 compadres?");

    expect(result.numberOfPeople).toBe(4);
  });

  test("should handle Central American expressions: '¿Tienen espacio pa' 4 panas?'", () => {
    const result = parseBookingData("¿Tienen espacio pa' 4 panas?");

    expect(result.numberOfPeople).toBe(4);
  });

  test("should handle Central American expressions: 'Vamos pa' 2 el sábado pana'", () => {
    const result = parseBookingData("Vamos pa' 2 el sábado pana");
    const expectedDate = formatDateUTC(getNextWeekday("sábado"));

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.date).toBe(expectedDate);
  });

  test("should handle mixed regional expressions: '¿Me aguantan pa' 4 parce y 2 más?'", () => {
    const result = parseBookingData("¿Me aguantan pa' 4 parce y 2 más?");

    // Este caso puede ser ambiguo, pero debería capturar al menos el primer número
    expect(result.numberOfPeople).toBeGreaterThanOrEqual(4);
  });

  test("should handle mixed regional expressions: 'caben 6 chamacos pa hoy?'", () => {
    const result = parseBookingData("caben 6 chamacos pa hoy?");
    const expectedDate = formatDateUTC(new Date());

    expect(result.numberOfPeople).toBe(6);
    expect(result.datetime.start.date).toBe(expectedDate);
  });
});

describe("parseBookingData - Complex Real-world Scenarios with Exact Validation", () => {
  test("should handle 'Buenas tardes, quisiera una mesa para 4 personas para hoy en la noche, alrededor de las 8pm'", () => {
    const result = parseBookingData(
      "Buenas tardes, quisiera una mesa para 4 personas para hoy en la noche, alrededor de las 8pm",
    );
    const expectedDate = formatDateUTC(new Date());

    expect(result.numberOfPeople).toBe(4);
    expect(result.datetime.start.date).toBe(expectedDate);
    expect(result.datetime.start.time).toBe("20:00:00"); // 8pm
  });

  test("should handle 'Hola, somos un grupo de 8 personas que nos gustaría cenar el viernes 12 de abril, preferiblemente después de las 8pm'", () => {
    const result = parseBookingData(
      "Hola, somos un grupo de 8 personas que nos gustaría cenar el viernes 12 de abril, preferiblemente después de las 8pm",
    );

    // Calculate the expected date based on whether April 12 has passed this year
    const today = new Date();
    const currentYear = today.getFullYear();
    let expectedYear = currentYear;

    // Check if April 12 has passed this year
    const april12ThisYear = new Date(currentYear, 3, 12); // Month is 0-indexed, so April is 3
    if (april12ThisYear < today) {
      expectedYear = currentYear + 1;
    }

    const expectedDate = formatDateUTC(new Date(expectedYear, 3, 12));

    expect(result.numberOfPeople).toBe(8);
    expect(result.datetime.start.date).toBe(expectedDate);
    expect(result.datetime.start.time).toBe("20:00:00"); // 8pm
  });

  test("should handle 'Necesito una reserva para 2 personas para el almuerzo del martes, entre la 1pm y las 3pm'", () => {
    const result = parseBookingData(
      "Necesito una reserva para 2 personas para el almuerzo del martes, entre la 1pm y las 3pm",
    );
    const expectedDate = formatDateUTC(getNextWeekday("martes"));

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.date).toBe(expectedDate);
    expect(result.datetime.start.time).toBe("13:00:00"); // 1pm
    expect(result.datetime.end.time).toBe("15:00:00"); // 3pm
  });

  test("should handle 'Reserva para celebración de cumpleaños, 10 personas el sábado 20 de julio a las 7pm'", () => {
    const result = parseBookingData(
      "Reserva para celebración de cumpleaños, 10 personas el sábado 20 de julio a las 7pm",
    );

    // Calculate the expected date based on whether July 20 has passed this year
    const today = new Date();
    const currentYear = today.getFullYear();
    let expectedYear = currentYear;

    // Check if July 20 has passed this year
    const july20ThisYear = new Date(currentYear, 6, 20); // Month is 0-indexed, so July is 6
    if (july20ThisYear < today) {
      expectedYear = currentYear + 1;
    }

    const expectedDate = formatDateUTC(new Date(expectedYear, 6, 20));

    expect(result.numberOfPeople).toBe(10);
    expect(result.datetime.start.date).toBe(expectedDate);
    expect(result.datetime.start.time).toBe("19:00:00"); // 7pm
  });

  test("should handle 'Mesa familiar para 6 personas, el domingo a la hora del almuerzo, alrededor de las 2pm'", () => {
    const result = parseBookingData(
      "Mesa familiar para 6 personas, el domingo a la hora del almuerzo, alrededor de las 2pm",
    );
    const expectedDate = formatDateUTC(getNextWeekday("domingo"));

    expect(result.numberOfPeople).toBe(6);
    expect(result.datetime.start.date).toBe(expectedDate);
    expect(result.datetime.start.time).toBe("14:00:00"); // 2pm
  });

  test("should handle 'Reserva para pareja, 2 personas, para esta noche, quizás a las 8:30pm'", () => {
    const result = parseBookingData(
      "Reserva para pareja, 2 personas, para esta noche, quizás a las 8:30pm",
    );
    const expectedDate = formatDateUTC(new Date());

    expect(result.numberOfPeople).toBe(2);
    expect(result.datetime.start.date).toBe(expectedDate);
    expect(result.datetime.start.time).toBe("20:30:00"); // 8:30pm
  });

  test("should handle 'Equipo de trabajo, 5 personas, necesitamos espacio para cena de negocios el jueves a las 7:30pm'", () => {
    const result = parseBookingData(
      "Equipo de trabajo, 5 personas, necesitamos espacio para cena de negocios el jueves a las 7:30pm",
    );
    const expectedDate = formatDateUTC(getNextWeekday("jueves"));

    expect(result.numberOfPeople).toBe(5);
    expect(result.datetime.start.date).toBe(expectedDate);
    expect(result.datetime.start.time).toBe("19:30:00"); // 7:30pm
  });

  test("should handle 'Familia numerosa, 8 personas, mesa para el domingo en la tarde, después de las 3pm'", () => {
    const result = parseBookingData(
      "Familia numerosa, 8 personas, mesa para el domingo en la tarde, después de las 3pm",
    );
    const expectedDate = formatDateUTC(getNextWeekday("domingo"));

    expect(result.numberOfPeople).toBe(8);
    expect(result.datetime.start.date).toBe(expectedDate);
    expect(result.datetime.start.time).toBe("15:00:00"); // 3pm
  });

  test("should handle 'Evento pequeño, solo 3 personas, para el miércoles a las 6:30pm'", () => {
    const result = parseBookingData(
      "Evento pequeño, solo 3 personas, para el miércoles a las 6:30pm",
    );
    const expectedDate = formatDateUTC(getNextWeekday("miércoles"));

    expect(result.numberOfPeople).toBe(3);
    expect(result.datetime.start.date).toBe(expectedDate);
    expect(result.datetime.start.time).toBe("18:30:00"); // 6:30pm
  });

  test("should handle 'Celebración íntima, 4 personas, el viernes a las 9pm para una cena romántica'", () => {
    const result = parseBookingData(
      "Celebración íntima, 4 personas, el viernes a las 9pm para una cena romántica",
    );
    const expectedDate = formatDateUTC(getNextWeekday("viernes"));

    expect(result.numberOfPeople).toBe(4);
    expect(result.datetime.start.date).toBe(expectedDate);
    expect(result.datetime.start.time).toBe("21:00:00"); // 9pm
  });
});
