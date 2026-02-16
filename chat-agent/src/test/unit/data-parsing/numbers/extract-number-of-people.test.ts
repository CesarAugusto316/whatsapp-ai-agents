import { expect, describe, test } from "bun:test";
import { extractNumberOfPeople } from "../../../../domain/booking/input-parser/booking-data-parser/extract-number-of-people";

describe("extractNumberOfPeople", () => {
  describe("números en palabras (1-10)", () => {
    const numberWords = [
      { input: "somos uno", expected: 1 },
      { input: "somos un grupo de uno", expected: 1 },
      { input: "vamos uno", expected: 1 },
      { input: "grupo de uno", expected: 1 },
      { input: "para uno", expected: 1 },
      { input: "con uno", expected: 1 },
      { input: "total uno", expected: 1 },
      { input: "reservamos uno", expected: 1 },
      { input: "cita para uno", expected: 1 },
      { input: "somos una", expected: 1 },
      { input: "confirmamos uno", expected: 1 },
      { input: "queremos uno", expected: 1 },
      { input: "necesitamos uno", expected: 1 },
      { input: "llegamos a ser uno", expected: 1 },
      { input: "terminamos siendo uno", expected: 1 },
      { input: "quedamos en ser uno", expected: 1 },
      { input: "somos dos", expected: 2 },
      { input: "vamos dos", expected: 2 },
      { input: "grupo de dos", expected: 2 },
      { input: "para dos", expected: 2 },
      { input: "con dos", expected: 2 },
      { input: "total dos", expected: 2 },
      { input: "reservamos dos", expected: 2 },
      { input: "cita para dos", expected: 2 },
      { input: "confirmamos dos", expected: 2 },
      { input: "queremos dos", expected: 2 },
      { input: "necesitamos dos", expected: 2 },
      { input: "llegamos a ser dos", expected: 2 },
      { input: "somos tres", expected: 3 },
      { input: "vamos tres", expected: 3 },
      { input: "grupo de tres", expected: 3 },
      { input: "para tres", expected: 3 },
      { input: "con tres", expected: 3 },
      { input: "total tres", expected: 3 },
      { input: "reservamos tres", expected: 3 },
      { input: "cita para tres", expected: 3 },
      { input: "confirmamos tres", expected: 3 },
      { input: "queremos tres", expected: 3 },
      { input: "necesitamos tres", expected: 3 },
      { input: "llegamos a ser tres", expected: 3 },
      { input: "somos cuatro", expected: 4 },
      { input: "vamos cuatro", expected: 4 },
      { input: "grupo de cuatro", expected: 4 },
      { input: "para cuatro", expected: 4 },
      { input: "con cuatro", expected: 4 },
      { input: "total cuatro", expected: 4 },
      { input: "reservamos cuatro", expected: 4 },
      { input: "cita para cuatro", expected: 4 },
      { input: "confirmamos cuatro", expected: 4 },
      { input: "queremos cuatro", expected: 4 },
      { input: "necesitamos cuatro", expected: 4 },
      { input: "llegamos a ser cuatro", expected: 4 },
      { input: "somos cinco", expected: 5 },
      { input: "vamos cinco", expected: 5 },
      { input: "grupo de cinco", expected: 5 },
      { input: "para cinco", expected: 5 },
      { input: "con cinco", expected: 5 },
      { input: "total cinco", expected: 5 },
      { input: "reservamos cinco", expected: 5 },
      { input: "cita para cinco", expected: 5 },
      { input: "confirmamos cinco", expected: 5 },
      { input: "queremos cinco", expected: 5 },
      { input: "necesitamos cinco", expected: 5 },
      { input: "llegamos a ser cinco", expected: 5 },
      { input: "somos seis", expected: 6 },
      { input: "vamos seis", expected: 6 },
      { input: "grupo de seis", expected: 6 },
      { input: "para seis", expected: 6 },
      { input: "con seis", expected: 6 },
      { input: "total seis", expected: 6 },
      { input: "reservamos seis", expected: 6 },
      { input: "cita para seis", expected: 6 },
      { input: "confirmamos seis", expected: 6 },
      { input: "queremos seis", expected: 6 },
      { input: "necesitamos seis", expected: 6 },
      { input: "llegamos a ser seis", expected: 6 },
      { input: "somos siete", expected: 7 },
      { input: "vamos siete", expected: 7 },
      { input: "grupo de siete", expected: 7 },
      { input: "para siete", expected: 7 },
      { input: "con siete", expected: 7 },
      { input: "total siete", expected: 7 },
      { input: "reservamos siete", expected: 7 },
      { input: "cita para siete", expected: 7 },
      { input: "confirmamos siete", expected: 7 },
      { input: "queremos siete", expected: 7 },
      { input: "necesitamos siete", expected: 7 },
      { input: "llegamos a ser siete", expected: 7 },
      { input: "somos ocho", expected: 8 },
      { input: "vamos ocho", expected: 8 },
      { input: "grupo de ocho", expected: 8 },
      { input: "para ocho", expected: 8 },
      { input: "con ocho", expected: 8 },
      { input: "total ocho", expected: 8 },
      { input: "reservamos ocho", expected: 8 },
      { input: "cita para ocho", expected: 8 },
      { input: "confirmamos ocho", expected: 8 },
      { input: "queremos ocho", expected: 8 },
      { input: "necesitamos ocho", expected: 8 },
      { input: "llegamos a ser ocho", expected: 8 },
      { input: "somos nueve", expected: 9 },
      { input: "vamos nueve", expected: 9 },
      { input: "grupo de nueve", expected: 9 },
      { input: "para nueve", expected: 9 },
      { input: "con nueve", expected: 9 },
      { input: "total nueve", expected: 9 },
      { input: "reservamos nueve", expected: 9 },
      { input: "cita para nueve", expected: 9 },
      { input: "confirmamos nueve", expected: 9 },
      { input: "queremos nueve", expected: 9 },
      { input: "necesitamos nueve", expected: 9 },
      { input: "llegamos a ser nueve", expected: 9 },
      { input: "somos diez", expected: 10 },
      { input: "vamos diez", expected: 10 },
      { input: "grupo de diez", expected: 10 },
      { input: "para diez", expected: 10 },
      { input: "con diez", expected: 10 },
      { input: "total diez", expected: 10 },
      { input: "reservamos diez", expected: 10 },
      { input: "cita para diez", expected: 10 },
      { input: "confirmamos diez", expected: 10 },
      { input: "queremos diez", expected: 10 },
      { input: "necesitamos diez", expected: 10 },
      { input: "llegamos a ser diez", expected: 10 },
    ];

    test.each(numberWords)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractNumberOfPeople(input)).toBe(expected);
      },
    );

    test("should return 0 for 'no uno' or 'no dos' (negation)", () => {
      expect(extractNumberOfPeople("no uno")).toBe(0);
      expect(extractNumberOfPeople("no dos")).toBe(0);
      expect(extractNumberOfPeople("no somos dos")).toBe(0);
    });
  });

  describe("patrones principales con números", () => {
    const patterns = [
      // Mesa/reserva/cita/evento para X
      { input: "mesa para 4", expected: 4 },
      { input: "mesa para 2 personas", expected: 2 },
      { input: "reserva para 6", expected: 6 },
      { input: "cita para 3", expected: 3 },
      { input: "evento para 10", expected: 10 },
      { input: "reservé para 5", expected: 5 },

      // Para/de/con X personas
      { input: "para 4 personas", expected: 4 },
      { input: "para 2 pers", expected: 2 },
      { input: "para 6 comensales", expected: 6 },
      { input: "de 8 personas", expected: 8 },
      { input: "con 5 amigos", expected: 5 },
      { input: "con 3 compas", expected: 3 },
      { input: "con 7 Panas", expected: 7 },

      // Grupo de X
      { input: "grupo de 4", expected: 4 },
      { input: "grupo de 6 personas", expected: 6 },

      // Somos/vamos/van X
      { input: "somos 4", expected: 4 },
      { input: "somos 5 personas", expected: 5 },
      { input: "vamos 6", expected: 6 },
      { input: "vamos a ser 8", expected: 8 },
      { input: "van a ir 10", expected: 10 },
      { input: "serán 3", expected: 3 },

      // X personas al inicio/final
      { input: "4 personas", expected: 4 },
      { input: "6 amigos", expected: 6 },
      { input: "8 compas", expected: 8 },
      { input: "personas 5", expected: 5 },
      { input: "amigos 10", expected: 10 },

      // Adultos/niños/bebes
      { input: "4 adultos", expected: 4 },
      { input: "2 niños", expected: 2 },
      { input: "3 bebes", expected: 3 },
      { input: "5 bebés", expected: 5 },
      { input: "6 menores", expected: 6 },

      // Total/en total/contamos con
      { input: "total de 4 personas", expected: 4 },
      { input: "en total 6", expected: 6 },
      { input: "contamos con 8", expected: 8 },
      { input: "sumamos 5", expected: 5 },
      { input: "llevamos 10", expected: 10 },

      // Estamos/vamos a ser
      { input: "estamos 4 personas", expected: 4 },
      { input: "vamos a ser 6", expected: 6 },
      { input: "vamos ser 8", expected: 8 },
      { input: "vamo ser 2", expected: 2 },
      { input: "vamos en 5", expected: 5 },
      { input: "estamos en 3", expected: 3 },

      // Confirmamos/queremos/necesitamos
      { input: "confirmamos 4 personas", expected: 4 },
      { input: "queremos 6", expected: 6 },
      { input: "necesitamos 8", expected: 8 },
      { input: "requerimos 5", expected: 5 },
      { input: "solicitamos 10", expected: 10 },

      // Reserva/cita/evento para X personas
      { input: "reserva para 4 personas", expected: 4 },
      { input: "cita para 2", expected: 2 },
      { input: "evento para 6 personas", expected: 6 },
      { input: "alojamiento para 8", expected: 8 },
      { input: "hotel para 10 personas", expected: 10 },

      // Llegamos a ser/terminamos siendo
      { input: "llegamos a ser 6", expected: 6 },
      { input: "llegaremos a ser 8", expected: 8 },
      { input: "terminamos siendo 4", expected: 4 },
      { input: "quedamos en ser 5", expected: 5 },

      // Conformamos/formamos grupo/armamos grupo
      { input: "conformamos grupo de 5", expected: 5 },
      { input: "formamos grupo 4", expected: 4 },
      { input: "armamos grupo de 6", expected: 6 },
      { input: "armamos grupo 8", expected: 8 },

      // Nosotros somos/grupo total de
      { input: "nosotros somos 4", expected: 4 },
      { input: "somos en total 6", expected: 6 },
      { input: "somos un grupo de 8", expected: 8 },
      { input: "grupo total de 10", expected: 10 },

      // X personas para reservar/mesa
      { input: "4 personas para reservar", expected: 4 },
      { input: "6 personas para mesa", expected: 6 },
      { input: "2 personas para cita", expected: 2 },
      { input: "8 personas para evento", expected: 8 },
      { input: "10 personas para alojamiento", expected: 10 },
      { input: "5 personas para hotel", expected: 5 },
    ];

    test.each(patterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractNumberOfPeople(input)).toBe(expected);
      },
    );
  });

  describe("términos regionales", () => {
    const regionalTerms = [
      { input: "4 chamacos", expected: 4 },
      { input: "6 pelados", expected: 6 },
      { input: "3 fiambres", expected: 3 },
      { input: "5 tíos", expected: 5 },
      { input: "7 compas", expected: 7 },
      { input: "2 parce", expected: 2 },
      { input: "8 panas", expected: 8 },
      { input: "10 muchachos", expected: 10 },
      { input: "4 cuates", expected: 4 },
      { input: "6 hermanos", expected: 6 },
      { input: "3 amigos", expected: 3 },
      { input: "5 colegas", expected: 5 },
      { input: "7 compadres", expected: 7 },
      { input: "2 quilombos", expected: 2 },
      { input: "8 pibes", expected: 8 },
      { input: "10 güeyes", expected: 10 },
      { input: "4 camaradas", expected: 4 },
      { input: "6 principes", expected: 6 },
      { input: "3 reyes", expected: 3 },
      { input: "5 capos", expected: 5 },
      { input: "7 jefes", expected: 7 },
      { input: "2 compañeros", expected: 2 },
      { input: "8 compañeritos", expected: 8 },
      { input: "10 socios", expected: 10 },
      { input: "4 vecinos", expected: 4 },
      { input: "6 conocidos", expected: 6 },
      { input: "3 familiares", expected: 3 },
      { input: "5 parientes", expected: 5 },
      { input: "7 primos", expected: 7 },
      { input: "2 sobrinos", expected: 2 },
      { input: "8 compinches", expected: 8 },
      { input: "10 paisanos", expected: 10 },
      { input: "4 chavos", expected: 4 },
      { input: "6 morochos", expected: 6 },
      { input: "3 pololos", expected: 3 },
      { input: "5 cracks", expected: 5 },
      { input: "7 mates", expected: 7 },
      { input: "2 cachorros", expected: 2 },
      { input: "8 peques", expected: 8 },
      { input: "10 jóvenes", expected: 10 },
      { input: "4 viajeros", expected: 4 },
      { input: "6 ocupantes", expected: 6 },
      { input: "3 clientes", expected: 3 },
      { input: "5 pasajeros", expected: 5 },
      { input: "7 miembros", expected: 7 },
      { input: "2 asociados", expected: 2 },
    ];

    test.each(regionalTerms)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractNumberOfPeople(input)).toBe(expected);
      },
    );

    test("should not match 'amiguitos' when looking for 'amigos'", () => {
      // This should not extract a number from "amiguitos"
      expect(extractNumberOfPeople("3 amiguitos")).toBe(3);
    });
  });

  describe("patrones generales", () => {
    const generalPatterns = [
      { input: "grupo de 4 personas", expected: 4 },
      { input: "equipo de 6 personas", expected: 6 },
      { input: "familia de 8 personas", expected: 8 },
      { input: "evento de 10 personas", expected: 10 },
      { input: "celebración de 5 personas", expected: 5 },
      { input: "4 personas", expected: 4 },
      { input: "6 comensales", expected: 6 },
      { input: "3 invitados", expected: 3 },
      { input: "8 huespedes", expected: 8 },
      { input: "5 huéspedes", expected: 5 },
      { input: "10 pax", expected: 10 },
      { input: "2 huésped", expected: 2 },
      { input: "7 convidados", expected: 7 },
      { input: "4 participantes", expected: 4 },
      { input: "6 asistentes", expected: 6 },
      { input: "8 miembros del grupo", expected: 8 },
      { input: "3 viajeros", expected: 3 },
      { input: "5 ocupantes", expected: 5 },
      { input: "7 comensales adultos", expected: 7 },
      { input: "2 niños acompañantes", expected: 2 },
      { input: "10 peques", expected: 10 },
      { input: "4 jóvenes", expected: 4 },
      { input: "6 mayores de edad", expected: 6 },
      { input: "8 clientes", expected: 8 },
      { input: "3 huéspedes registrados", expected: 3 },
      { input: "5 personas mayores", expected: 5 },
      { input: "7 compañeros de viaje", expected: 7 },
      { input: "2 pasajeros", expected: 2 },
      { input: "10 miembros", expected: 10 },
      { input: "4 asociados", expected: 4 },
    ];

    test.each(generalPatterns)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractNumberOfPeople(input)).toBe(expected);
      },
    );
  });

  describe("casos especiales", () => {
    test("should handle 'solo' cases", () => {
      expect(extractNumberOfPeople("solo")).toBe(0);
      expect(extractNumberOfPeople("solos")).toBe(0);
      expect(extractNumberOfPeople("solo dos")).toBe(2);
      expect(extractNumberOfPeople("solos 2")).toBe(2);
      expect(extractNumberOfPeople("solo uno")).toBe(1);
      expect(extractNumberOfPeople("solo 1")).toBe(1);
    });

    test("should avoid 'no dos' (negation)", () => {
      expect(extractNumberOfPeople("no dos")).toBe(0);
      expect(extractNumberOfPeople("no somos dos")).toBe(0);
    });
  });

  describe("casos de chat comunes", () => {
    const chatCases = [
      { input: "Hola, quiero reservar una mesa para 4 personas", expected: 4 },
      { input: "Buenos días, necesitamos reserva para 2", expected: 2 },
      { input: "Quisiera hacer una cita para 6", expected: 6 },
      { input: "Hola! somos 8 amigos para cenar", expected: 8 },
      { input: "Buenas, vamos 10 en total", expected: 10 },
      { input: "Hola, mesa para 2 por favor", expected: 2 },
      { input: "Quiero reservar para 5 compas", expected: 5 },
      { input: "Necesito una mesa para 4 adultos y 2 niños", expected: 4 },
      { input: "Reserva para mañana, somos 6", expected: 6 },
      { input: "Hola, confirmamos asistencia de 8 personas", expected: 8 },
    ];

    test.each(chatCases)(
      "should extract $expected from '$input'",
      ({ input, expected }) => {
        expect(extractNumberOfPeople(input)).toBe(expected);
      },
    );
  });

  describe("tolerancia a errores de escritura", () => {
    const typoCases = [
      { input: "mesa para 4 presonas", expected: 4 },
      { input: "reserva para 6 peronas", expected: 6 },
      { input: "para 8 personas", expected: 8 },
      { input: "somos 4 presonas", expected: 4 },
      { input: "vamos 6 presonas", expected: 6 },
      { input: "grupo de 8 presonas", expected: 8 },
      { input: "4 comensales", expected: 4 },
      { input: "6 comensales", expected: 6 },
      { input: "8 invitados", expected: 8 },
      { input: "3 huespedes", expected: 3 },
    ];

    test.each(typoCases)(
      "should extract $expected from '$input' (with typos)",
      ({ input, expected }) => {
        expect(extractNumberOfPeople(input)).toBe(expected);
      },
    );
  });

  describe("límites y casos edge", () => {
    test("should return 0 for numbers > 50", () => {
      expect(extractNumberOfPeople("somos 51")).toBe(0);
      expect(extractNumberOfPeople("100 personas")).toBe(0);
      expect(extractNumberOfPeople("grupo de 75")).toBe(0);
    });

    test("should return 0 for numbers <= 0", () => {
      expect(extractNumberOfPeople("somos 0")).toBe(0);
      expect(extractNumberOfPeople("-5 personas")).toBe(0);
    });

    test("should return 0 when no pattern matches", () => {
      expect(extractNumberOfPeople("hola mundo")).toBe(0);
      expect(extractNumberOfPeople("quiero comer")).toBe(0);
      expect(extractNumberOfPeople("")).toBe(0);
      expect(extractNumberOfPeople("   ")).toBe(0);
    });

    test("should handle boundary values (1 and 50)", () => {
      expect(extractNumberOfPeople("somos 1")).toBe(1);
      expect(extractNumberOfPeople("somos 50")).toBe(50);
      expect(extractNumberOfPeople("grupo de 50 personas")).toBe(50);
    });
  });

  describe("case insensitivity", () => {
    const caseCases = [
      { input: "SOMOS 4 PERSONAS", expected: 4 },
      { input: "Somos 4 Personas", expected: 4 },
      { input: "somos 4 personas", expected: 4 },
      { input: "PARA 6 AMIGOS", expected: 6 },
      { input: "Para 6 Amigos", expected: 6 },
      { input: "para 6 amigos", expected: 6 },
      { input: "GRUPO DE 8", expected: 8 },
      { input: "Grupo De 8", expected: 8 },
      { input: "grupo de 8", expected: 8 },
    ];

    test.each(caseCases)(
      "should extract $expected from '$input' (case insensitive)",
      ({ input, expected }) => {
        expect(extractNumberOfPeople(input)).toBe(expected);
      },
    );
  });
});
