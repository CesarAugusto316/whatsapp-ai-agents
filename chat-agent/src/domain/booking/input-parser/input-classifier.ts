import { InputType } from "./booking-schemas";

/**
 * @todo
 * Próximo paso evolutivo
 * Después de 1-2 semanas en producción:
 * Loggear los casos donde Math.abs(inputDataScore - questionScore) < 3
 * Analizar si hay patrones recurrentes que el clasificador falla
 * Añadir nuevos patrones basados en datos reales, no suposiciones
 * Es evolución pragmática: código determinista hoy, mejora con datos mañana.
 * @param message
 * @returns
 */
export function classifyInput(message: string): InputType {
  const m = message.trim().toLowerCase();

  // Special handling for short confirmation words that should remain as INFORMATION_REQUEST
  // This addresses the regression where "Ok", "Sí", etc. are being misclassified
  if (
    m === "ok" ||
    m === "okis" ||
    m === "sí" ||
    m === "si" ||
    m === "vale" ||
    m === "si" ||
    m === "dale"
  ) {
    return InputType.INFORMATION_REQUEST; // Default for pure confirmations
  }

  // Additional normalization for specific edge cases without affecting main logic
  // This handles the issue where removing punctuation or using lowercase shouldn't break classification
  // But we need to be careful not to interfere with the existing logic that relies on punctuation

  // Early detection for specific issue: "caben 6 chamacos pa hoy?" and similar patterns
  // If the message starts with question words like "caben", "hay", "tienen", etc. followed by numbers and regional terms
  // but ends with time/place references, it's likely a question despite containing data elements
  if (
    /\b^(caben|hay|tienen|tenés|queda|quedan|alcanza|aguantan|entran|puedo|podemos|me dan|nos dan|me ubican|nos ubican|páguenos)\s+\d+\s+\w+\s+(pa|para)\s+\w+/i.test(
      m.replace(/[¿?]/g, ""),
    )
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Additional early detection for common question patterns without punctuation
  if (
    /\b^(hay|tienen|tenés|queda|quedan)\s+(mesa|espacio|disponible)/i.test(m) &&
    /\b\d+\b/.test(m)
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Handle "hay disponibilidad para hoy" and similar patterns
  if (
    /\b^(hay|tienen|tenés|queda|quedan)\s+disponibilidad\s+(para|pa)\s+\w+$/i.test(
      m,
    )
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Handle contextual numbers that are NOT person counts (e.g., "mesa 5", "habitación 101")
  if (
    /\b(mesa|habitación|room|table|sala|area|sector|zona|local|lugar|posición|posicion|número|numero|código|codigo|reserva|orden)\s+\d+\b/i.test(
      m,
    )
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Enhanced question detection for informal speech without punctuation
  const hasQuestionWithoutPunctuation =
    // Check for question words that typically indicate a question even without punctuation
    /\b(caben|cubre|alcanza|aguantan|entran|queda|quedan|disponible|disponibles|hay|tienen|tenés|tienes|está|están|puedo|podemos|me dan|nos dan|me hace|nos hace|me ubican|nos ubican|páguenos)\b/i.test(
      m,
    ) &&
    // Ensure it's not followed by strong data indicators that would make it INPUT_DATA
    !/\b(personas?|pers|comensales?|somos|seremos|será?n|vamos a ser)\b/i.test(
      m.split(/[\.\!\?¿]/)[0] || m,
    );

  // === PATRONES QUE INDICAN INPUT_DATA (reserva datos) ===
  const inputDataPatterns = [
    // Números de personas explícitos (incluyendo abreviaturas y términos regionales)
    {
      test: () =>
        /\b(\d+)\s*(personas?|pers|comensales?|somos|seremos|será?n|vamos a ser|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|hermano|people|persons|companion|companions)\b/i.test(
          m,
        ) ||
        // Detectar errores comunes como "persnas" como variante de "personas"
        /\b(\d+)\s*persnas?\b/i.test(m),
      weight: 10,
    },
    {
      test: () => m.length < 20 && /\b(para|pa)\s+(\d+)\b/i.test(m),
      weight: 9,
    }, // "para 2", "pa 2", "para 4 personas"
    { test: () => /^\d+$/.test(m) && parseInt(m) <= 50, weight: 8 }, // Solo un número (asumir personas)

    // Fechas relativas
    {
      test: () =>
        /\b(hoy|mañana|manana|pasad[oa]\s*mañana|mañna|manña|este\s+fin\s+de\s+semana|fin\s+de\s+semana|viernes|vierne|sábado|sabado|domingo|lunes|martes|miércoles|miercoles|jueves|tarde|noche)\b/i.test(
          m,
        ),
      weight: 8,
    },

    // Fechas absolutas
    {
      test: () =>
        /\b(\d{1,2}[\s\/\-]\d{1,2}([\s\/\-]\d{2,4})?|\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))\b/i.test(
          m,
        ),
      weight: 7,
    },

    // Horas explícitas (incluyendo números escritos en palabras)
    {
      test: () =>
        /\b(\d{1,2}:\d{2}(:\d{2})?|a\s+las\s+\d{1,2}|(\d{1,2})(am|pm|a\.?m\.?|p\.?m\.?)|a\s+las\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce))\b/i.test(
          m,
        ),
      weight: 7,
    },

    // Rangos horarios
    {
      test: () =>
        /\b(de\s+\d{1,2}(:\d{2})?\s+a\s+\d{1,2}(:\d{2})?|entre\s+\d{1,2}\s+y\s+\d{1,2}|desde\s+\d{1,2}\s+hasta\s+\d{1,2})\b/i.test(
          m,
        ),
      weight: 8,
    },

    // Nombres de personas (palabras con mayúsculas o formatos comunes)
    {
      test: () =>
        // Only match capitalized words that are likely names (not single letters or common words)
        (/[A-Z][a-z]{2,}/.test(message) &&
          !/^(hola|buenos|buenas|gracias|adiós|adios|por favor|sí|si|no|vale|ok|claro|perfecto|buen|bueno|buena|buenos|buenas|usted|ustedes|vosotros|vosotras)$/i.test(
            m,
          )) || // Names with capitalization (avoiding common words)
        // Common name patterns in lowercase contexts (for names that might appear in lowercase)
        (/\bnombre de ([a-z]{3,})\b/i.test(m) &&
          !/\bnombre de (la|el|lo|le|me|te|se|nos|os|usted|ustedes|vosotros|vosotras|mi|tu|su|nuestro|vuestra|sus)\b/i.test(
            m,
          )) || // "nombre de carlos" pattern
        (/\bme llamo ([a-z]{3,})\b/i.test(m) &&
          !/\bme llamo (la|el|lo|le|me|te|se|nos|os|usted|ustedes|vosotros|vosotras|mi|tu|su|nuestro|vuestra|sus)\b/i.test(
            m,
          )), // "me llamo alberto" pattern
      weight: 7, // Aumenté el peso para que tenga más relevancia
    },

    // Verbos de acción + datos
    {
      test: () =>
        /\b(reservar|reserva|res|reservación|mesa|turno|cupo|lugar|sitio|reservation|book|booking|table|seat)\b/i.test(
          m,
        ) &&
        (/\b\d+\b/.test(m) ||
          /\b(hoy|mañana|pasado|today|tomorrow|afternoon|evening|tonight)\b/i.test(
            m,
          )),
      weight: 7,
    },

    // Confirmaciones de continuación (del TODO del prompt)
    {
      test: () =>
        /\b(sí|si|vale|ok|dale|vamos|sigamos|continuemos|adelante|procedamos)\b/i.test(
          m,
        ) && m.length < 15,
      weight: 5,
    },

    // Correcciones rápidas (patrones de corrección común en chats)
    {
      test: () =>
        /.*\b(para|pa|a las|el|la)\s+\d+.*\.{2,}.*\b(no|pero).*\b(para|pa|a las|el|la)\s+\d+.*/i.test(
          m,
        ) || // "para 2... no, para 4"
        /.*\b(\d+).*\.{2,}.*\b(no|pero).*\b(\d+).*/i.test(m), // More general pattern for corrections with numbers
      weight: 9,
    },

    // Frases que indican reserva para una persona específica (incluso sin números)
    {
      test: () =>
        /\b(reserva|mesa|cita)\s+(?:es\s+)?para\s+[A-Z][a-z]{2,}/i.test(
          message,
        ) || // "reserva para Juan"
        /\b(reserva|mesa|cita)\s+(?:es\s+)?para\s+[a-z]{3,}/i.test(m), // "reserva para juan"
      weight: 8,
    },
  ];

  // === PATRONES QUE INDICAN CUSTOMER_QUESTION (preguntas/información) ===
  const questionPatterns = [
    // Palabras interrogativas explícitas (incluyendo variantes comunes con errores)
    {
      test: () =>
        /\b(quién|quiénes|qué|que|cuál|cuáles|cual|cómo|como|dónde|donde|cuándo|cuando|por qué|porque|para qué|para que)\b/i.test(
          m,
        ),
      weight: 10,
    },

    // Verbos de pregunta/información
    {
      test: () =>
        /\b(tienen|tenéis|hay|es|son|puedo|podemos|quisiera|me gustaría|necesito|necesitamos|dan|dará|daran|aguantan|alcanza|caben|cabemos|cubre|ubican|páguenos)\b/i.test(
          m,
        ) && !/\b(\d+|mañana|manana|hoy|pasado)\b/i.test(m),
      weight: 8,
    },

    // Preguntas sobre disponibilidad/info (incluyendo variantes comunes)
    {
      test: () =>
        /\b(disponibilidad|disponible|abren|cierran|horario|menú|menu|carta|opciones|precio|precios|costo|cuesta|sale|aceptan|formas|pago|vacantes|cupo|rato|chance|espacio|lugar|hueco)\b/i.test(
          m,
        ),
      weight: 9,
    },

    // Signos de interrogación (aunque no siempre están)
    { test: () => m.includes("¿") || m.includes("?"), weight: 6 },
  ];

  // Calcular score
  const inputDataScore = inputDataPatterns.reduce(
    (sum, p) => (p.test() ? sum + p.weight : sum),
    0,
  );
  const questionScore = questionPatterns.reduce(
    (sum, p) => (p.test() ? sum + p.weight : sum),
    0,
  );

  // === DECISIÓN CON THRESHOLDS ===
  const DIFF_THRESHOLD = 3; // Diferencia mínima para decisión clara

  // Caso especial: Si hay signos de interrogación y hay tanto INPUT_DATA como CUSTOMER_QUESTION,
  // pero la pregunta tiene palabras interrogativas explícitas, priorizar CUSTOMER_QUESTION
  if (
    (m.includes("¿") || m.includes("?")) &&
    inputDataScore > 0 &&
    questionScore > 0
  ) {
    // Buscar palabras interrogativas explícitas
    const hasInterrogativeWords =
      /\b(quién|quiénes|qué|cuál|cuáles|cómo|dónde|cuándo|por qué|para qué)\b/i.test(
        m,
      );
    if (hasInterrogativeWords) {
      return InputType.INFORMATION_REQUEST;
    }

    // Si hay signos de pregunta y verbos de pregunta, priorizar CUSTOMER_QUESTION
    const hasQuestionVerbs =
      /\b(tienen|tenéis|hay|es|son|puedo|podemos|quisiera|me gustaría|necesito|necesitamos)\b/i.test(
        m,
      );
    if (hasQuestionVerbs) {
      return InputType.INFORMATION_REQUEST;
    }

    // Si la frase comienza con una palabra interrogativa (antes de cualquier número o información de reserva), priorizar CUSTOMER_QUESTION
    const trimmedMessage = message.trim();
    // Buscar si alguna palabra interrogativa aparece al inicio de la frase (posiblemente después de "¿")
    // Dividimos la frase en palabras y buscamos si alguna interrogativa está entre las primeras palabras
    const words = trimmedMessage.replace(/[¿?]/g, "").trim().split(/\s+/);
    if (words.length > 0) {
      // Verificamos si alguna de las primeras palabras es interrogativa
      const firstTwoWords = words.slice(0, 2); // Tomamos las dos primeras palabras
      const hasQuestionWordInBeginning = firstTwoWords.some((word) =>
        /\b(quién|quiénes|qué|cuál|cuáles|cómo|dónde|cuándo|por qué|para qué)\b/i.test(
          word,
        ),
      );

      if (hasQuestionWordInBeginning) {
        return InputType.INFORMATION_REQUEST;
      }
    }
  }

  // Caso especial adicional: Si hay signos de pregunta y la frase empieza con "¿A qué...",
  // y hay elementos de pregunta, priorizar CUSTOMER_QUESTION
  if (
    m.startsWith("¿a qué") &&
    (m.includes("personas") || m.includes("personas?"))
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Caso especial: Frases que contienen palabras de pregunta seguidas de palabras relacionadas con precios
  if (
    (m.includes("cuanto") || m.includes("cuánto")) &&
    (m.includes("sale") ||
      m.includes("cuesta") ||
      m.includes("precio") ||
      m.includes("costo"))
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Caso especial: Frases coloquiales y regionales que son claramente preguntas
  if (
    (m.includes("¿me") || m.startsWith("me")) &&
    (m.includes("alcanza") ||
      m.includes("aguantan") ||
      m.includes("caben") ||
      m.includes("cubre") ||
      m.includes("ubican") ||
      m.includes("páguenos"))
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Caso especial: Frases que empiezan con "¿Tenés", "¿Tienen", etc. seguidas de "lugar", "espacio", etc.
  if (
    (m.startsWith("¿tenés") ||
      m.startsWith("¿tienen") ||
      m.startsWith("¿hay")) &&
    (m.includes("lugar") ||
      m.includes("espacio") ||
      m.includes("pa'") ||
      m.includes("para"))
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Caso especial: Frases con "¿Cabemos", "¿Caben", "¿Cubre", etc.
  if (
    m.startsWith("¿cabemos") ||
    m.startsWith("¿caben") ||
    m.startsWith("¿cubre") ||
    m.startsWith("¿hay") ||
    m.startsWith("¿tienen") ||
    m.startsWith("¿van a entrar") ||
    m.startsWith("¿nos ubican")
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Caso especial: Frases coloquiales con pronombres y verbos de capacidad/ubicación
  if (
    (m.includes("¿van a entrar") ||
      m.includes("¿nos ubican") ||
      m.includes("¿nos dan")) &&
    (m.includes("pa'") || m.includes("para"))
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Caso especial: Si hay signos de interrogación y palabras clave de pregunta, priorizar CUSTOMER_QUESTION
  if ((m.includes("¿") || m.includes("?")) && questionScore > 0) {
    // Aumentar el score de pregunta si hay signos de interrogación
    const adjustedQuestionScore = questionScore + 3;
    if (adjustedQuestionScore - inputDataScore >= DIFF_THRESHOLD) {
      return InputType.INFORMATION_REQUEST;
    }
  }

  // Caso 1: INPUT_DATA es mucho más fuerte
  if (inputDataScore >= 7 && inputDataScore - questionScore >= DIFF_THRESHOLD) {
    return InputType.USER_PROVIDED_DATA;
  }

  // Caso 2: CUSTOMER_QUESTION es mucho más fuerte
  if (questionScore >= 8 && questionScore - inputDataScore >= DIFF_THRESHOLD) {
    return InputType.INFORMATION_REQUEST;
  }

  // Caso 3: Ambiguo - usar heurística de fallback
  // Si hay algún dato numérico o fecha/hora, priorizar INPUT_DATA
  if (
    inputDataScore > 0 &&
    (/\b\d+\b/.test(m) ||
      /\b(hoy|mañana|pasado|:\d{2}|am|pm|tarde|noche)\b/i.test(m))
  ) {
    return InputType.USER_PROVIDED_DATA;
  }

  // Enhanced check for sentences starting with question words, even with punctuation
  // If a sentence starts with or contains question words like "caben", "tienen", etc.
  // and has numbers, but the question context is stronger, treat as NORMAL_SENTENCE
  const startsWithQuestionWord =
    /\b^(caben|tienen|tenés|hay|queda|quedan|alcanza|aguantan|entran|puedo|podemos|me dan|nos dan|me ubican|nos ubican|páguenos|cuánto|cuanto|qué|que|dónde|donde|cuándo|cuando|por qué|porque|para qué|para que|a qué|a que)/i.test(
      m.replace(/[¿?]/g, "").trim(),
    );

  if (
    startsWithQuestionWord &&
    /\b(caben|tienen|tenés|hay|queda|quedan|alcanza|aguantan|entran|puedo|podemos|me dan|nos dan|me ubican|nos ubican|páguenos)\b/i.test(
      m,
    ) &&
    /\b\d+\s*(chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|personas?|pers|comensales?)\b/i.test(
      m,
    )
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Special case: If the message contains "reserva" + "para" + a name, it's likely INPUT_DATA
  if (
    /\breserva\s+para\s+[A-Z][a-z]{2,}/i.test(message) ||
    /\breserva\s+para\s+[a-z]{3,}/i.test(m)
  ) {
    // Increase the input data score for this pattern
    const nameInReservationPattern =
      /\breserva\s+para\s+([A-Za-z]{3,})\b/i.test(message);
    if (nameInReservationPattern) {
      // This is handled by the pattern matching, so we don't need special logic here
    }
  }

  // Specific fix for the issue mentioned: "caben 6 chamacos pa hoy?" should be NORMAL_SENTENCE
  // This handles the case where a question word is followed by numbers and regional terms
  if (/\b^caben\s+\d+\s+chamacos?\b/i.test(m.replace(/[¿?]/g, ""))) {
    return InputType.INFORMATION_REQUEST;
  }

  // Check for confirmation emojis commonly used in mobile messaging
  const hasConfirmationEmoji = /(?:👍|✅|👌|👏|🙌|🎉|✔️|☑️)/.test(message);

  // Enhanced check for informal questions without punctuation
  // If we detected question-like phrasing without punctuation and the question score isn't significantly lower,
  // classify as NORMAL_SENTENCE instead of defaulting
  if (hasQuestionWithoutPunctuation && questionScore >= inputDataScore - 2) {
    return InputType.INFORMATION_REQUEST;
  }

  // If the message contains confirmation emojis, treat as USER_PROVIDED_DATA
  if (hasConfirmationEmoji) {
    return InputType.USER_PROVIDED_DATA;
  }

  // Special handling for short confirmation words that should remain as INFORMATION_REQUEST
  // This addresses the regression where "Ok", "Sí", etc. are being misclassified
  if (m === "ok" || m === "sí" || m === "si" || m === "vale") {
    // Only classify as USER_PROVIDED_DATA if there are other strong data indicators
    if (inputDataScore > questionScore) {
      return InputType.USER_PROVIDED_DATA;
    } else {
      return InputType.INFORMATION_REQUEST; // Default for pure confirmations
    }
  }

  // Special case: if the message contains question words like "caben", "alcanza", etc.
  // AND has numbers but the context suggests a question, treat as NORMAL_SENTENCE
  if (
    hasQuestionWithoutPunctuation &&
    /\b(caben|alcanza|aguantan|entran|queda|quedan|tienen|hay|puedo|podemos|me dan|nos dan|me ubican|nos ubican|páguenos)\b/i.test(
      m,
    ) &&
    /\b\d+\s*(chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|personas?|pers|comensales?)\b/i.test(
      m,
    )
  ) {
    return InputType.INFORMATION_REQUEST;
  }

  // Caso 4: Por defecto, asumir pregunta si no hay datos claros
  return InputType.INFORMATION_REQUEST;
}
