import { describe, expect, test } from "bun:test";
import { InputIntent, classifyInput } from "@/domain/restaurant/booking";

describe("classifyInput", () => {
  // Casos básicos de INPUT_DATA
  test("should classify explicit person count as INPUT_DATA", () => {
    expect(classifyInput("una reserva para 2 personas")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("somos 4 personas")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("vamos a ser 6")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("serán 3 comensales")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should classify time references as INPUT_DATA", () => {
    expect(classifyInput("mañana a las 8pm")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("hoy a las 7:30")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("a las 9 de la noche")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should classify date references as INPUT_DATA", () => {
    expect(classifyInput("para mañana")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("el viernes")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("este fin de semana")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("el 15 de marzo")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("15/03/2024")).toBe(InputIntent.USER_PROVIDED_DATA);
  });

  test("should classify number-only inputs as INPUT_DATA", () => {
    expect(classifyInput("2")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("4")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("8")).toBe(InputIntent.USER_PROVIDED_DATA);
  });

  test("should classify combined date/time/person inputs as INPUT_DATA", () => {
    expect(classifyInput("una reserva para 2 personas mañana a las 8pm")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("reserva para 4 el viernes a las 9pm")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("mesa para 6 el sábado a las 8:30")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  // Casos básicos de CUSTOMER_QUESTION
  test("should classify explicit questions as CUSTOMER_QUESTION", () => {
    expect(classifyInput("¿Tienen disponibilidad?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¿Qué opciones tienen?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¿Cuánto cuesta?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¿Dónde están?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¿A qué hora abren?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should classify statements with question words as CUSTOMER_QUESTION", () => {
    expect(classifyInput("Me gustaría saber si tienen disponibilidad")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Necesito saber cuánto cuesta")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Quisiera saber qué menú tienen")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should classify info-seeking phrases as CUSTOMER_QUESTION", () => {
    expect(classifyInput("¿Tienen menú vegetariano?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¿Aceptan tarjeta?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¿Cuál es el horario?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¿Hacen delivery?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  // Casos límite y ambiguos
  test("should handle ambiguous cases correctly", () => {
    // Casos donde hay elementos de ambas categorías pero uno predomina
    expect(
      classifyInput("Gracias, ¿tienen disponibilidad para 4 personas?"),
    ).toBe(InputIntent.INFORMATION_REQUEST);
    expect(classifyInput("Para 2 personas, ¿está disponible?")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    ); // Predomina INPUT_DATA
  });

  test("should handle short confirmation inputs", () => {
    expect(classifyInput("Sí")).toBe(InputIntent.INFORMATION_REQUEST); // Por defecto
    expect(classifyInput("Ok")).toBe(InputIntent.INFORMATION_REQUEST); // Por defecto
    expect(classifyInput("Vale")).toBe(InputIntent.INFORMATION_REQUEST); // Por defecto
  });

  test("should handle mixed content with numbers and questions", () => {
    expect(classifyInput("¿Tienen mesa para 4 personas?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¿Disponibilidad para el viernes?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¿A qué hora para 6 personas?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  // Casos especiales
  test("should handle names in inputs", () => {
    expect(classifyInput("Juan y María, para el domingo")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("Reserva a nombre de Carlos")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should handle range times", () => {
    expect(classifyInput("Entre las 8 y las 10pm")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("De 7:30 a 9:30")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should handle action verbs with data", () => {
    expect(classifyInput("Quiero reservar mesa para 4")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("Necesito una reserva para hoy")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  // Casos extremos
  test("should handle empty or near-empty inputs", () => {
    expect(classifyInput("")).toBe(InputIntent.INFORMATION_REQUEST); // Por defecto
    expect(classifyInput("   ")).toBe(InputIntent.INFORMATION_REQUEST); // Por defecto
    expect(classifyInput("ok")).toBe(InputIntent.INFORMATION_REQUEST); // Por defecto
  });

  test("should handle very short inputs with clear intent", () => {
    // Inputs cortos que son claramente INPUT_DATA
    expect(classifyInput("2 personas")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("mañana")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("tarde")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Inputs cortos que son claramente CUSTOMER_QUESTION
    expect(classifyInput("¿?")).toBe(InputIntent.INFORMATION_REQUEST);
    expect(classifyInput("¿disponible?")).toBe(InputIntent.INFORMATION_REQUEST);
  });

  // Casos reales de producción con errores ortográficos, abreviaturas y sin puntuación
  test("should handle typos and misspellings in INPUT_DATA", () => {
    // Errores comunes en números y personas
    expect(classifyInput("una resrva para 2 persnas")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("reserva pa 4 personas")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("somos 3 persnas")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("reserva pa 2")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Errores en fechas
    expect(classifyInput("para manana")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("el vierne")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("mañna")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Errores en horas
    expect(classifyInput("a las 8 pm")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("a las 9pm")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("a las ocho")).toBe(InputIntent.USER_PROVIDED_DATA);
  });

  test("should handle typos and misspellings in CUSTOMER_QUESTION", () => {
    // Errores comunes en preguntas
    expect(classifyInput("tienen disponibilid")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("disponiblidad")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("cuanto cuesta")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("donde estan")).toBe(InputIntent.INFORMATION_REQUEST);
    expect(classifyInput("que opciones tienen")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle abbreviations and informal language", () => {
    // Abreviaturas comunes
    expect(classifyInput("res para 2")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("2 pers")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("pa 4")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("mesa pa hoy")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Lenguaje informal
    expect(classifyInput("necesito una mesa pa 2")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("quiero reservar pa 4")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should handle lack of punctuation", () => {
    // Sin signos de interrogación
    expect(classifyInput("Tienen disponibilidad")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Que opciones hay")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Cuanto cuesta")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("A que hora abren")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );

    // Sin puntuación en inputs de datos
    expect(classifyInput("reserva para 2 personas mañana")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("mesa pa 4 el viernes")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should handle mixed cases with typos and abbreviations", () => {
    // Combinaciones de errores y abreviaturas
    expect(classifyInput("res para 2 personas manana")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("tienen disponibilidad pa 4")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("mesa pa 6 el sabado a las 8pm")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("cuanto sale una mesa pa 2")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle exclamation marks instead of question marks", () => {
    // Usando exclamaciones en lugar de preguntas
    expect(classifyInput("¡Tienen disponibilidad!")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¡Necesito mesa para 2!")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¡A qué hora cierran!")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle extra spaces and informal formatting", () => {
    // Espacios adicionales
    expect(classifyInput("  mesa   para   4  ")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("   tienen   disponibilidad   ")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );

    // Mayúsculas/minúsculas mezcladas
    expect(classifyInput("MEsa PaRa 2 PerSonAs MaÑAna")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("TIENEN DISPONIBILIDAD")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  // Casos de modismos y expresiones locales/regioanales de LATAM
  test("should handle Mexican expressions", () => {
    // Expresiones mexicanas comunes
    expect(
      classifyInput("Orale, ¿tienen disponibilidad para 4 chamacos?"),
    ).toBe(InputIntent.INFORMATION_REQUEST);
    expect(classifyInput("Jalamos pa' 2 güeyes el lunes")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Qué pedo, tienen espacio pa' 6?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Chamaco pa' 4 el viernes")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Me alcanza pa' 2?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle Colombian expressions", () => {
    // Expresiones colombianas comunes
    expect(classifyInput("¿Parce, tienen pa' 4 pelados el jueves?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Vamos pa' 2 el sábado parce")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Me aguantan pa' 6?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Pásenme pa' 3 el viernes")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Tiene vacantes pa' 5?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle Argentinian/Uruguayan expressions", () => {
    // Expresiones rioplatenses comunes
    expect(classifyInput("¿Tenés lugar pa' 4 fiambres?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Somos 2 quilombos pa' hoy")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Van a entrar pa' 6?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Pa' 3 pibes el sábado")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Me hacen lugar pa' 2?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle Spanish expressions", () => {
    // Expresiones españolas comunes
    expect(classifyInput("¿Tienen sitio pa' 4 colegas?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Somos 2 tíos pa' mañana")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Cabemos pa' 6?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Pa' 3 compis el domingo")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Hay hueco pa' 5?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    ); // Uso de "hueco" como espacio
  });

  test("should handle Peruvian expressions", () => {
    // Expresiones peruanas comunes
    expect(classifyInput("¿Tienen cupo pa' 4 compadres?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Vamos pa' 2 el jueves hermano")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Hay espacio pa' 6?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Pa' 3 amigos el sábado")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Páguenos pa' 5?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    ); // "Páguenos" como forma coloquial
  });

  test("should handle Ecuadorian expressions", () => {
    // Expresiones ecuatorianas comunes
    expect(classifyInput("¿Tienen rato pa' 4 compadres?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    ); // "rato" como disponibilidad
    expect(classifyInput("Somos 2 cuates pa' hoy")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Caben pa' 6?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Pa' 3 colegas el viernes")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Nos ubican pa' 5?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle Central American expressions", () => {
    // Expresiones centroamericanas comunes
    expect(classifyInput("¿Tienen espacio pa' 4 panas?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Vamos pa' 2 el sábado pana")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Cubre pa' 6?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    ); // "Cubre" como disponibilidad
    expect(classifyInput("Pa' 3 muchachos el domingo")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("¿Me dan chance pa' 5?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    ); // "Chance" como oportunidad/espacio
  });

  test("should handle mixed regional expressions", () => {
    // Combinaciones de expresiones regionales
    expect(classifyInput("¿Me aguantan pa' 4 parce y 2 más?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Somos 3 hermanos pa' el viernes")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("caben 6 chamacos pa hoy?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Pa' 2 compas el sábado, ¿sí?")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  // Additional tests for lowercase and no punctuation cases
  test("should handle lowercase inputs with no punctuation", () => {
    // Lowercase without punctuation - INPUT_DATA
    expect(classifyInput("reserva para 2 personas")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("mesa para 4 el viernes")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("hoy a las 8pm")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("mañana")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("2 personas")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Lowercase without punctuation - CUSTOMER_QUESTION
    expect(classifyInput("tienen disponibilidad")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("que opciones hay")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("cuanto cuesta")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("a que hora abren")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("hay mesa para 4")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle no punctuation cases", () => {
    // Without any punctuation - INPUT_DATA
    expect(classifyInput("RESERVA PARA 2 PERSONAS")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("MESA PARA 4 EL VIERNES")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("HOY A LAS 8PM")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("MAÑANA")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Without any punctuation - CUSTOMER_QUESTION
    expect(classifyInput("TIENEN DISPONIBILIDAD")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("QUE OPCIONES HAY")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("CUANTO CUESTA")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("A QUE HORA ABREN")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle mixed lowercase uppercase with no punctuation", () => {
    // Mixed case without punctuation - INPUT_DATA
    expect(classifyInput("Reserva Para 2 Personas")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("Mesa Para 4 El Viernes")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("Hoy A Las 8pm")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Mixed case without punctuation - CUSTOMER_QUESTION
    expect(classifyInput("Tienen Disponibilidad")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Que Opciones Hay")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("Cuanto Cuesta")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle regional expressions without punctuation", () => {
    // Regional expressions without punctuation - INPUT_DATA
    expect(classifyInput("pa 2 el sabado")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("vamos pa 4 el lunes")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("somos 6 para hoy")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );

    // Regional expressions without punctuation - CUSTOMER_QUESTION
    expect(classifyInput("caben 6 chamacos pa hoy")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("espacio pa 4")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("me aguantan pa 3")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle complex inputs without punctuation", () => {
    // Complex without punctuation - INPUT_DATA
    expect(classifyInput("reserva para 4 personas el viernes a las 8pm")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("mesa para 2 manana")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );

    // Complex without punctuation - CUSTOMER_QUESTION
    expect(classifyInput("tienen disponible para 4 personas")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("hay disponibilidad para hoy")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  // Casos que no están cubiertos:
  test("should handle inputs with ONLY question words but NO data", () => {
    expect(classifyInput("¿cuándo?")).toBe(InputIntent.INFORMATION_REQUEST);
    expect(classifyInput("¿para qué día?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("¿a qué hora?")).toBe(InputIntent.INFORMATION_REQUEST);
    expect(classifyInput("a qué hora")).toBe(InputIntent.INFORMATION_REQUEST);
  });

  test("should handle confirmation phrases as USER_PROVIDED_DATA", () => {
    expect(classifyInput("sí, para 2")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("dale, mañana")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("ok, a las 8pm")).toBe(InputIntent.USER_PROVIDED_DATA);
    // Estos son casos críticos que tu código maneja con DIFF_THRESHOLD
  });

  // === CASOS CRÍTICOS DE PRODUCCIÓN (basados en logs reales de sistemas de reservas) ===

  test("should handle negations correctly (data with correction)", () => {
    // Usuario corrige su intención - sigue siendo INPUT_DATA
    expect(classifyInput("no, para 3 personas")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("no mañana, pasado mañana")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("no a las 8, a las 9pm")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );

    // Negación pura sin datos → pregunta
    expect(classifyInput("no gracias")).toBe(InputIntent.INFORMATION_REQUEST);
  });

  test("should handle time/date questions vs data", () => {
    // Preguntas puras sobre tiempo → INFORMATION_REQUEST
    expect(classifyInput("¿a qué hora?")).toBe(InputIntent.INFORMATION_REQUEST);
    expect(classifyInput("¿para qué día?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("cuándo abre")).toBe(InputIntent.INFORMATION_REQUEST);

    // Datos de tiempo explícitos → USER_PROVIDED_DATA
    expect(classifyInput("a las 8pm")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("para el viernes")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should handle multi-line inputs correctly", () => {
    // Datos en múltiples líneas → INPUT_DATA
    expect(classifyInput("para 4 personas\nmañana a las 8pm")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );

    // Pregunta en múltiples líneas → INFORMATION_REQUEST
    expect(classifyInput("¿tienen\nmesa para 6?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle inputs with URLs or special characters", () => {
    // Datos con URL (ej: compartir reserva) → INPUT_DATA
    expect(classifyInput("reserva para 2 https://example.com")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );

    // Pregunta con URL → INFORMATION_REQUEST
    expect(classifyInput("¿cómo reservo? https://example.com")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle inputs with only punctuation", () => {
    expect(classifyInput("...")).toBe(InputIntent.INFORMATION_REQUEST); // Ambiguo → fallback seguro
    expect(classifyInput("!!!")).toBe(InputIntent.INFORMATION_REQUEST);
    expect(classifyInput("¿")).toBe(InputIntent.INFORMATION_REQUEST);
  });

  test("should handle inputs with phone numbers or emails", () => {
    // Contacto sin datos de reserva → INFORMATION_REQUEST (no es dato de reserva)
    expect(classifyInput("mi email es user@example.com")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("555-1234")).toBe(InputIntent.INFORMATION_REQUEST);

    // Contacto + datos → INPUT_DATA (prioriza datos)
    expect(classifyInput("para 2 personas, email user@example.com")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should handle inputs with payment references", () => {
    // Pago sin datos → pregunta
    expect(classifyInput("aceptan tarjeta?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("pago con efectivo")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );

    // Pago + datos → INPUT_DATA
    expect(classifyInput("para 3 personas, pago con tarjeta")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should handle inputs with special requests (allergies, preferences)", () => {
    // Solicitud sin datos → pregunta
    expect(classifyInput("tienen opciones veganas?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("mesa en terraza")).toBe(
      InputIntent.INFORMATION_REQUEST,
    ); // Ambiguo → pregunta

    // Solicitud + datos → INPUT_DATA
    expect(classifyInput("para 4 personas, mesa en terraza")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should handle inputs with urgency markers", () => {
    // Urgencia + datos → INPUT_DATA
    expect(classifyInput("urgente para hoy a las 8pm")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("ASAP para 2 personas")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );

    // Urgencia pura → pregunta
    expect(classifyInput("¡urgente!")).toBe(InputIntent.INFORMATION_REQUEST);
  });

  test("should handle numbers that are NOT people counts", () => {
    // Números contextuales que NO son personas → pregunta
    expect(classifyInput("mesa 5")).toBe(InputIntent.INFORMATION_REQUEST); // Pregunta por mesa específica
    expect(classifyInput("habitación 101")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("código de reserva ABC123")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );

    // Números explícitos de personas → datos
    expect(classifyInput("5 personas")).toBe(InputIntent.USER_PROVIDED_DATA);
  });

  test("should handle emoji-only or emoji-heavy inputs", () => {
    // Emojis como confirmación → INPUT_DATA (comportamiento real de usuarios móviles)
    expect(classifyInput("👍")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("✅ para 2")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("📅 mañana")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Emojis como pregunta → INFORMATION_REQUEST
    expect(classifyInput("❓")).toBe(InputIntent.INFORMATION_REQUEST);
    expect(classifyInput("🤔 tienen disponibilidad?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle mixed language inputs (Spanglish common in LATAM)", () => {
    // Datos en Spanglish → INPUT_DATA
    expect(classifyInput("reservation for 4 tomorrow")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("pa 2 people")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Preguntas en Spanglish → INFORMATION_REQUEST
    expect(classifyInput("do you have availability?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
    expect(classifyInput("tienen mesa for 6?")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle rapid-fire corrections (real chat behavior)", () => {
    expect(classifyInput("para 2... no, para 4")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("mañana... mejor pasado")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
    expect(classifyInput("8pm... digo 9pm")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    );
  });

  test("should handle inputs with repeated words (typing errors)", () => {
    // Errores de teclado con datos → INPUT_DATA
    expect(classifyInput("para 22 personas")).toBe(
      InputIntent.USER_PROVIDED_DATA,
    ); // 22 es válido (<50)
    expect(classifyInput("mañanañana")).toBe(InputIntent.USER_PROVIDED_DATA); // Palabra corrupta

    // Errores con preguntas → INFORMATION_REQUEST
    expect(classifyInput("tienentienen disponibilidad")).toBe(
      InputIntent.INFORMATION_REQUEST,
    );
  });

  test("should handle boundary cases for people count", () => {
    // Límites válidos → INPUT_DATA
    expect(classifyInput("1 persona")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("50 personas")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Límites inválidos → sigue siendo INPUT_DATA (validación posterior)
    expect(classifyInput("0 personas")).toBe(InputIntent.USER_PROVIDED_DATA);
    expect(classifyInput("100 personas")).toBe(InputIntent.USER_PROVIDED_DATA);

    // Números sin contexto → ambiguo pero con heurística de datos
    expect(classifyInput("25")).toBe(InputIntent.USER_PROVIDED_DATA); // Número solo → asumir personas
  });
});
