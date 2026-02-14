import { describe, expect, test } from "bun:test";
import { classifyInput } from "@/application/use-cases/sagas/booking/workflows/helpers/input-parser/input-classifier";
import { InputIntent } from "@/domain/restaurant/booking";

describe("classifyInput", () => {
  // Casos básicos de INPUT_DATA
  test("should classify explicit person count as INPUT_DATA", () => {
    expect(classifyInput("una reserva para 2 personas")).toBe(
      InputIntent.INPUT_DATA,
    );
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
    expect(classifyInput("una reserva para 2 personas mañana a las 8pm")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("reserva para 4 el viernes a las 9pm")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("mesa para 6 el sábado a las 8:30")).toBe(
      InputIntent.INPUT_DATA,
    );
  });

  // Casos básicos de CUSTOMER_QUESTION
  test("should classify explicit questions as CUSTOMER_QUESTION", () => {
    expect(classifyInput("¿Tienen disponibilidad?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("¿Qué opciones tienen?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("¿Cuánto cuesta?")).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("¿Dónde están?")).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("¿A qué hora abren?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  test("should classify statements with question words as CUSTOMER_QUESTION", () => {
    expect(classifyInput("Me gustaría saber si tienen disponibilidad")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Necesito saber cuánto cuesta")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Quisiera saber qué menú tienen")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  test("should classify info-seeking phrases as CUSTOMER_QUESTION", () => {
    expect(classifyInput("¿Tienen menú vegetariano?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("¿Aceptan tarjeta?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("¿Cuál es el horario?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("¿Hacen delivery?")).toBe(InputIntent.NORMAL_SENTENCE);
  });

  // Casos límite y ambiguos
  test("should handle ambiguous cases correctly", () => {
    // Casos donde hay elementos de ambas categorías pero uno predomina
    expect(
      classifyInput("Gracias, ¿tienen disponibilidad para 4 personas?"),
    ).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("Para 2 personas, ¿está disponible?")).toBe(
      InputIntent.INPUT_DATA,
    ); // Predomina INPUT_DATA
  });

  test("should handle short confirmation inputs", () => {
    expect(classifyInput("Sí")).toBe(InputIntent.NORMAL_SENTENCE); // Por defecto
    expect(classifyInput("Ok")).toBe(InputIntent.NORMAL_SENTENCE); // Por defecto
    expect(classifyInput("Vale")).toBe(InputIntent.NORMAL_SENTENCE); // Por defecto
  });

  test("should handle mixed content with numbers and questions", () => {
    expect(classifyInput("¿Tienen mesa para 4 personas?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("¿Disponibilidad para el viernes?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("¿A qué hora para 6 personas?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  // Casos especiales
  test("should handle names in inputs", () => {
    expect(classifyInput("Juan y María, para el domingo")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("Reserva a nombre de Carlos")).toBe(
      InputIntent.INPUT_DATA,
    );
  });

  test("should handle range times", () => {
    expect(classifyInput("Entre las 8 y las 10pm")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("De 7:30 a 9:30")).toBe(InputIntent.INPUT_DATA);
  });

  test("should handle action verbs with data", () => {
    expect(classifyInput("Quiero reservar mesa para 4")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("Necesito una reserva para hoy")).toBe(
      InputIntent.INPUT_DATA,
    );
  });

  // Casos extremos
  test("should handle empty or near-empty inputs", () => {
    expect(classifyInput("")).toBe(InputIntent.NORMAL_SENTENCE); // Por defecto
    expect(classifyInput("   ")).toBe(InputIntent.NORMAL_SENTENCE); // Por defecto
    expect(classifyInput("ok")).toBe(InputIntent.NORMAL_SENTENCE); // Por defecto
  });

  test("should handle very short inputs with clear intent", () => {
    // Inputs cortos que son claramente INPUT_DATA
    expect(classifyInput("2 personas")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("mañana")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("tarde")).toBe(InputIntent.INPUT_DATA);

    // Inputs cortos que son claramente CUSTOMER_QUESTION
    expect(classifyInput("¿?")).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("¿disponible?")).toBe(InputIntent.NORMAL_SENTENCE);
  });

  // Casos reales de producción con errores ortográficos, abreviaturas y sin puntuación
  test("should handle typos and misspellings in INPUT_DATA", () => {
    // Errores comunes en números y personas
    expect(classifyInput("una resrva para 2 persnas")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("reserva pa 4 personas")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("somos 3 persnas")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("reserva pa 2")).toBe(InputIntent.INPUT_DATA);

    // Errores en fechas
    expect(classifyInput("para manana")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("el vierne")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("mañna")).toBe(InputIntent.INPUT_DATA);

    // Errores en horas
    expect(classifyInput("a las 8 pm")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("a las 9pm")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("a las ocho")).toBe(InputIntent.INPUT_DATA);
  });

  test("should handle typos and misspellings in CUSTOMER_QUESTION", () => {
    // Errores comunes en preguntas
    expect(classifyInput("tienen disponibilid")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("disponiblidad")).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("cuanto cuesta")).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("donde estan")).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("que opciones tienen")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  test("should handle abbreviations and informal language", () => {
    // Abreviaturas comunes
    expect(classifyInput("res para 2")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("2 pers")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("pa 4")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("mesa pa hoy")).toBe(InputIntent.INPUT_DATA);

    // Lenguaje informal
    expect(classifyInput("necesito una mesa pa 2")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("quiero reservar pa 4")).toBe(InputIntent.INPUT_DATA);
  });

  test("should handle lack of punctuation", () => {
    // Sin signos de interrogación
    expect(classifyInput("Tienen disponibilidad")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Que opciones hay")).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("Cuanto cuesta")).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("A que hora abren")).toBe(InputIntent.NORMAL_SENTENCE);

    // Sin puntuación en inputs de datos
    expect(classifyInput("reserva para 2 personas mañana")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("mesa pa 4 el viernes")).toBe(InputIntent.INPUT_DATA);
  });

  test("should handle mixed cases with typos and abbreviations", () => {
    // Combinaciones de errores y abreviaturas
    expect(classifyInput("res para 2 personas manana")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("tienen disponibilidad pa 4")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("mesa pa 6 el sabado a las 8pm")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("cuanto sale una mesa pa 2")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  test("should handle exclamation marks instead of question marks", () => {
    // Usando exclamaciones en lugar de preguntas
    expect(classifyInput("¡Tienen disponibilidad!")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("¡Necesito mesa para 2!")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¡A qué hora cierran!")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  test("should handle extra spaces and informal formatting", () => {
    // Espacios adicionales
    expect(classifyInput("  mesa   para   4  ")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("   tienen   disponibilidad   ")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );

    // Mayúsculas/minúsculas mezcladas
    expect(classifyInput("MEsa PaRa 2 PerSonAs MaÑAna")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("TIENEN DISPONIBILIDAD")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  // Casos de modismos y expresiones locales/regioanales de LATAM
  test("should handle Mexican expressions", () => {
    // Expresiones mexicanas comunes
    expect(
      classifyInput("Orale, ¿tienen disponibilidad para 4 chamacos?"),
    ).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("Jalamos pa' 2 güeyes el lunes")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Qué pedo, tienen espacio pa' 6?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Chamaco pa' 4 el viernes")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Me alcanza pa' 2?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  test("should handle Colombian expressions", () => {
    // Expresiones colombianas comunes
    expect(classifyInput("¿Parce, tienen pa' 4 pelados el jueves?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Vamos pa' 2 el sábado parce")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Me aguantan pa' 6?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Pásenme pa' 3 el viernes")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Tiene vacantes pa' 5?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  test("should handle Argentinian/Uruguayan expressions", () => {
    // Expresiones rioplatenses comunes
    expect(classifyInput("¿Tenés lugar pa' 4 fiambres?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Somos 2 quilombos pa' hoy")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Van a entrar pa' 6?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Pa' 3 pibes el sábado")).toBe(InputIntent.INPUT_DATA);
    expect(classifyInput("¿Me hacen lugar pa' 2?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  test("should handle Spanish expressions", () => {
    // Expresiones españolas comunes
    expect(classifyInput("¿Tienen sitio pa' 4 colegas?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Somos 2 tíos pa' mañana")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Cabemos pa' 6?")).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("Pa' 3 compis el domingo")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Hay hueco pa' 5?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    ); // Uso de "hueco" como espacio
  });

  test("should handle Peruvian expressions", () => {
    // Expresiones peruanas comunes
    expect(classifyInput("¿Tienen cupo pa' 4 compadres?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Vamos pa' 2 el jueves hermano")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Hay espacio pa' 6?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Pa' 3 amigos el sábado")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Páguenos pa' 5?")).toBe(InputIntent.NORMAL_SENTENCE); // "Páguenos" como forma coloquial
  });

  test("should handle Ecuadorian expressions", () => {
    // Expresiones ecuatorianas comunes
    expect(classifyInput("¿Tienen rato pa' 4 compadres?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    ); // "rato" como disponibilidad
    expect(classifyInput("Somos 2 cuates pa' hoy")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Caben pa' 6?")).toBe(InputIntent.NORMAL_SENTENCE);
    expect(classifyInput("Pa' 3 colegas el viernes")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Nos ubican pa' 5?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
  });

  test("should handle Central American expressions", () => {
    // Expresiones centroamericanas comunes
    expect(classifyInput("¿Tienen espacio pa' 4 panas?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Vamos pa' 2 el sábado pana")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Cubre pa' 6?")).toBe(InputIntent.NORMAL_SENTENCE); // "Cubre" como disponibilidad
    expect(classifyInput("Pa' 3 muchachos el domingo")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("¿Me dan chance pa' 5?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    ); // "Chance" como oportunidad/espacio
  });

  test("should handle mixed regional expressions", () => {
    // Combinaciones de expresiones regionales
    expect(classifyInput("¿Me aguantan pa' 4 parce y 2 más?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Somos 3 hermanos pa' el viernes, ¿cholo?")).toBe(
      InputIntent.INPUT_DATA,
    );
    expect(classifyInput("caben 6 chamacos pa hoy?")).toBe(
      InputIntent.NORMAL_SENTENCE,
    );
    expect(classifyInput("Pa' 2 compas el sábado, ¿sí?")).toBe(
      InputIntent.INPUT_DATA,
    );
  });
});
