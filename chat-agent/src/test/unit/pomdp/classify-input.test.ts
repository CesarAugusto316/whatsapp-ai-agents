import { describe, expect, test } from "bun:test";
import { classifyInput } from "@/application/use-cases/sagas/booking/workflows/helpers/input-parser/input-classifier";
import { InputIntent } from "@/domain/restaurant/booking";

describe("classifyInput", () => {
  // Casos básicos de INPUT_DATA
  test("should classify explicit person count as INPUT_DATA", () => {
    expect(classifyInput("una reserva para 2 personas")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("somos 4 personas")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("vamos a ser 6")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("serán 3 comensales")).toBe(InputIntent.INPUT_DATA);
  });

  test("should classify time references as INPUT_DATA", () => {
    expect(classifyInput("mañana a las 8pm")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("hoy a las 7:30")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("a las 9 de la noche")).toBe(InputIntent.INPUT_DATA);
  });

  test("should classify date references as INPUT_DATA", () => {
    expect(classifyInput("para mañana")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("el viernes")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("este fin de semana")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("el 15 de marzo")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("15/03/2024")).toBe(InputIntent.INPUT_DATA);
  });

  test("should classify number-only inputs as INPUT_DATA", () => {
    expect(classifyInput("2")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("4")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("8")).toBe(InputIntent.INPUT_DATA);
  });

  test("should classify combined date/time/person inputs as INPUT_DATA", () => {
    expect(classifyInput("una reserva para 2 personas mañana a las 8pm")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("reserva para 4 el viernes a las 9pm")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("mesa para 6 el sábado a las 8:30")).toBe(InputIntent.INPUT_DATA);
  });

  // Casos básicos de CUSTOMER_QUESTION
  test("should classify explicit questions as CUSTOMER_QUESTION", () => {
    expect(classifyInput("¿Tienen disponibilidad?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("¿Qué opciones tienen?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("¿Cuánto cuesta?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("¿Dónde están?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("¿A qué hora abren?")).toBe(InputIntent.CUSTOMER_QUESTION);
  });

  test("should classify statements with question words as CUSTOMER_QUESTION", () => {
    expect(classifyInput("Me gustaría saber si tienen disponibilidad")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("Necesito saber cuánto cuesta")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("Quisiera saber qué menú tienen")).toBe(InputIntent.CUSTOMER_QUESTION);
  });

  test("should classify info-seeking phrases as CUSTOMER_QUESTION", () => {
    expect(classifyInput("¿Tienen menú vegetariano?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("¿Aceptan tarjeta?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("¿Cuál es el horario?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("¿Hacen delivery?")).toBe(InputIntent.CUSTOMER_QUESTION);
  });

  // Casos límite y ambiguos
  test("should handle ambiguous cases correctly", () => {
    // Casos donde hay elementos de ambas categorías pero uno predomina
    expect(classifyInput("Gracias, ¿tienen disponibilidad para 4 personas?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("Para 2 personas, ¿está disponible?")).toBe(InputIntent.INPUT_DATA); // Predomina INPUT_DATA
  });

  test("should handle short confirmation inputs", () => {
    expect(classifyInput("Sí")).toBe(InputIntent.CUSTOMER_QUESTION); // Por defecto
    expect(classifyInput("Ok")).toBe(InputIntent.CUSTOMER_QUESTION); // Por defecto
    expect(classifyInput("Vale")).toBe(InputIntent.CUSTOMER_QUESTION); // Por defecto
  });

  test("should handle mixed content with numbers and questions", () => {
    expect(classifyInput("¿Tienen mesa para 4 personas?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("¿Disponibilidad para el viernes?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("¿A qué hora para 6 personas?")).toBe(InputIntent.CUSTOMER_QUESTION);
  });

  // Casos especiales
  test("should handle names in inputs", () => {
    expect(classifyInput("Juan y María, para el domingo")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("Reserva a nombre de Carlos")).toBe(InputIntent.INPUT_DATA);
  });

  test("should handle range times", () => {
    expect(classifyInput("Entre las 8 y las 10pm")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("De 7:30 a 9:30")).toBe(InputIntent.INPUT_DATA);
  });

  test("should handle action verbs with data", () => {
    expect(classifyInput("Quiero reservar mesa para 4")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("Necesito una reserva para hoy")).toBe(InputIntent.INPUT_DATA);
  });

  // Casos extremos
  test("should handle empty or near-empty inputs", () => {
    expect(classifyInput("")).toBe(InputIntent.CUSTOMER_QUESTION); // Por defecto
    expect(classifyInput("   ")).toBe(InputIntent.CUSTOMER_QUESTION); // Por defecto
    expect(classifyInput("ok")).toBe(InputIntent.CUSTOMER_QUESTION); // Por defecto
  });

  test("should handle very short inputs with clear intent", () => {
    // Inputs cortos que son claramente INPUT_DATA
    expect(classifyInput("2 personas")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("mañana")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("tarde")).toBe(InputIntent.INPUT_DATA);

    // Inputs cortos que son claramente CUSTOMER_QUESTION
    expect(classifyInput("¿?")).toBe(InputIntent.CUSTOMER_QUESTION);
    expect(classifyInput("¿disponible?")).toBe(InputIntent.CUSTOMER_QUESTION);
  });
});
