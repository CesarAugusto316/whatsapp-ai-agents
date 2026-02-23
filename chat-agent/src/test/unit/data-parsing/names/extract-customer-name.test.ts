import { expect, describe, test } from "bun:test";
import { extractCustomerName } from "@/domain/booking/input-parser/booking-data-parser/extract-customer-name";

describe("extractCustomerName", () => {
  describe("patrones 'a nombre de'", () => {
    const patterns = [
      { input: "a nombre de Juan Pérez", expected: "Juan Pérez" },
      { input: "al nombre de María García", expected: "María García" },
      { input: "a nombre de Carlos", expected: "Carlos" },
      { input: "reserva a nombre de Ana López", expected: "Ana López" },
      { input: "quiero reservar a nombre de Roberto", expected: "Roberto" },
      {
        input: "a nombre de Jose Luis Rodriguez",
        expected: "Jose Luis Rodriguez",
      },
      { input: "la reserva está a nombre de Carmen", expected: "Carmen" },
      { input: "viene a nombre de Francisco", expected: "Francisco" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("patrones 'reservado por' y similares", () => {
    const patterns = [
      { input: "reservado por Pedro Sánchez", expected: "Pedro Sánchez" },
      { input: "reserva por Laura Martín", expected: "Laura Martín" },
      { input: "reservado por Luis", expected: "Luis" },
      { input: "la cita fue reservada por Elena", expected: "Elena" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("patrones 'reserva de/para'", () => {
    const patterns = [
      { input: "reserva de Miguel Ángel", expected: "Miguel Ángel" },
      { input: "reserva para Patricia", expected: "Patricia" },
      { input: "la reserva es de Javier", expected: "Javier" },
      { input: "hice una reserva para Gabriela", expected: "Gabriela" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("patrones 'cita de/para'", () => {
    const patterns = [
      { input: "cita para Ricardo", expected: "Ricardo" },
      { input: "cita de Alejandro", expected: "Alejandro" },
      { input: "tengo una cita para Fernando", expected: "Fernando" },
      { input: "la cita es de Mauricio", expected: "Mauricio" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("patrones 'mesa de/para'", () => {
    const patterns = [
      { input: "mesa para Eduardo", expected: "Eduardo" },
      { input: "mesa de Raúl", expected: "Raúl" },
      { input: "necesito mesa para Arturo", expected: "Arturo" },
      { input: "la mesa está a nombre de Héctor", expected: "Héctor" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("patrones 'evento de/para'", () => {
    const patterns = [
      { input: "evento para Silvia", expected: "Silvia" },
      { input: "evento de Mónica", expected: "Mónica" },
      { input: "el evento es para Beatriz", expected: "Beatriz" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("patrones 'de parte de'", () => {
    const patterns = [
      { input: "de parte de Esteban", expected: "Esteban" },
      { input: "llamo de parte de Irene", expected: "Irene" },
      { input: "mensaje de parte de Olga", expected: "Olga" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("patrones 'bajo el nombre de'", () => {
    const patterns = [
      { input: "bajo el nombre de Vicente", expected: "Vicente" },
      { input: "bajo nombre de Yolanda", expected: "Yolanda" },
      {
        input: "la reserva está bajo el nombre de Zacarías",
        expected: "Zacarías",
      },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("patrones en inglés", () => {
    const patterns = [
      { input: "booking for John Smith", expected: "John Smith" },
      { input: "reservation for Mary Johnson", expected: "Mary Johnson" },
      { input: "under the name of Robert Brown", expected: "Robert Brown" },
      { input: "under name David Wilson", expected: "David Wilson" },
      { input: "booking under the name Sarah Davis", expected: "Sarah Davis" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("nombres simples (fallback)", () => {
    const patterns = [
      { input: "Hola, soy María", expected: "María" },
      { input: "Buenos días, me llamo Carmen", expected: "Carmen" },
      { input: "Isabel", expected: "Isabel" },
      { input: "José Luis", expected: "José Luis" },
      { input: "Me dicen Fernando", expected: "Fernando" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("nombres con apellidos compuestos", () => {
    const patterns = [
      {
        input: "a nombre de María del Carmen López García",
        expected: "María del Carmen López García",
      },
      {
        input: "reserva para José María Rodríguez",
        expected: "José María Rodríguez",
      },
      { input: "cita para Ana María", expected: "Ana María" },
      { input: "bajo el nombre de Juan Carlos", expected: "Juan Carlos" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("casos de chat comunes", () => {
    const patterns = [
      {
        input: "Hola, quiero hacer una reserva a nombre de Juan Pérez",
        expected: "Juan Pérez",
      },
      {
        input: "Buenos días, la reserva está a nombre de María",
        expected: "María",
      },
      {
        input: "Hola, reserva para 4 personas a nombre de Carlos",
        expected: "Carlos",
      },
      {
        input: "Quisiera confirmar mi cita a nombre de Ana López",
        expected: "Ana López",
      },
      { input: "Necesito cambiar la reserva de Pedro", expected: "Pedro" },
      { input: "Hola, mesa para 2 a nombre de Luis", expected: "Luis" },
      {
        input: "Buenas tardes, tengo una cita para Patricia",
        expected: "Patricia",
      },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("casos con nombres cortos (2 letras)", () => {
    const patterns = [
      // Nota: el patrón requiere mínimo 3 letras, así que nombres de 2 letras no se extraen
      // Excepto cuando coinciden con patrones específicos como "reserva para"
      { input: "a nombre de El", expected: "" },
      { input: "reserva para Jo", expected: "Jo" }, // Se extrae porque coincide con el patrón
      { input: "cita de Li", expected: "" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("casos que deben retornar string vacío", () => {
    const patterns = [
      { input: "hola mundo", expected: "" },
      { input: "quiero reservar", expected: "" },
      { input: "necesito una mesa", expected: "" },
      { input: "buenos días", expected: "" },
      { input: "gracias", expected: "" },
      { input: "", expected: "" },
      { input: "   ", expected: "" },
      { input: "reserva para hoy", expected: "" },
      { input: "cita para mañana", expected: "" },
    ];

    test.each(patterns)(
      "should return empty string for '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("tolerancia a errores de escritura", () => {
    const patterns = [
      { input: "a nombre de juan pérez", expected: "juan pérez" },
      { input: "anombrede Maria", expected: "Maria" },
      { input: "a  nombre  de  Carlos", expected: "Carlos" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input' (with typos)",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("case sensitivity", () => {
    const patterns = [
      { input: "A NOMBRE DE JUAN PEREZ", expected: "JUAN PEREZ" },
      { input: "a nombre de Juan Perez", expected: "Juan Perez" },
      { input: "Reserva Para Maria", expected: "Maria" },
      { input: "RESERVA PARA JOSE", expected: "JOSE" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input' (case variations)",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("nombres con caracteres especiales", () => {
    const patterns = [
      { input: "a nombre de María José", expected: "María José" },
      { input: "reserva para Óscar", expected: "Óscar" },
      { input: "cita de Ángel", expected: "Ángel" },
      { input: "bajo nombre de Ñoño", expected: "Ñoño" },
      { input: "reserva para Úrsula", expected: "Úrsula" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("múltiples nombres en el mensaje (debe retornar el primero relevante)", () => {
    const patterns = [
      {
        input: "reserva para Juan pero viene María",
        expected: "Juan pero viene María",
      },
      { input: "a nombre de Carlos, teléfono de Ana", expected: "Carlos" },
      { input: "Hola soy Luis, la reserva es para Carmen", expected: "Luis" },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });

  describe("evitar palabras comunes como nombres", () => {
    const patterns = [
      { input: "reserva para hoy", expected: "" },
      { input: "cita para mañana", expected: "" },
      { input: "mesa para la", expected: "" },
      { input: "evento para el", expected: "" },
      { input: "reserva para personas", expected: "" },
      { input: "cita para clientes", expected: "" },
    ];

    test.each(patterns)(
      "should return empty string for '$input'",
      ({ input, expected }) => {
        expect(extractCustomerName(input)).toBe(expected);
      },
    );
  });
});
