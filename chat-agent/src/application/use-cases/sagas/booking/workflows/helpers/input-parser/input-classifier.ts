import { InputIntent } from "@/domain/restaurant/booking";

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
export function classifyInput(message: string): InputIntent {
  const m = message.trim().toLowerCase();

  // === PATRONES QUE INDICAN INPUT_DATA (reserva datos) ===
  const inputDataPatterns = [
    // Números de personas explícitos
    {
      test: () =>
        /\b(\d+)\s*(personas?|comensales?|somos|seremos|será?n|vamos a ser)\b/i.test(
          m,
        ),
      weight: 10,
    },
    { test: () => m.length < 20 && /\bpara\s+(\d+)\b/i.test(m), weight: 9 }, // "para 2", "para 4 personas"
    { test: () => /^\d+$/.test(m) && parseInt(m) <= 20, weight: 8 }, // Solo un número (asumir personas)

    // Fechas relativas
    {
      test: () =>
        /\b(hoy|mañana|pasad[oa]\s*mañana|este\s+fin\s+de\s+semana|fin\s+de\s+semana|viernes|sábado|domingo|lunes|martes|miércoles|jueves)\b/i.test(
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

    // Horas explícitas
    {
      test: () =>
        /\b(\d{1,2}:\d{2}(:\d{2})?|a\s+las\s+\d{1,2}|(\d{1,2})(am|pm|a\.?m\.?|p\.?m\.?))\b/i.test(
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
        /[A-Z][a-z]+(\s+[A-Z][a-z]+)?/.test(message) &&
        !/^(hola|buenos|buenas|gracias|adiós|adios|por favor|sí|si|no|vale|ok|vale|claro|perfecto)$/i.test(
          m,
        ),
      weight: 6,
    },

    // Verbos de acción + datos
    {
      test: () =>
        /\b(reservar|reserva|reservación|mesa|turno|cupo|lugar|sitio)\b/i.test(
          m,
        ) &&
        (/\b\d+\b/.test(m) || /\b(hoy|mañana|pasado)\b/i.test(m)),
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
  ];

  // === PATRONES QUE INDICAN CUSTOMER_QUESTION (preguntas/información) ===
  const questionPatterns = [
    // Palabras interrogativas explícitas
    {
      test: () =>
        /\b(quién|quiénes|qué|cuál|cuáles|cómo|dónde|cuándo|por qué|para qué)\b/i.test(
          m,
        ),
      weight: 10,
    },

    // Verbos de pregunta/información
    {
      test: () =>
        /\b(tienen|tenéis|hay|es|son|puedo|podemos|quisiera|me gustaría|necesito|necesitamos)\b/i.test(
          m,
        ) && !/\b(\d+|mañana|hoy|pasado)\b/i.test(m),
      weight: 8,
    },

    // Preguntas sobre disponibilidad/info
    {
      test: () =>
        /\b(disponibilidad|disponible|abren|cierran|horario|menú|menu|carta|opciones|precio|precios|costo|cuesta|aceptan|formas|pago)\b/i.test(
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

  // Caso 1: INPUT_DATA es mucho más fuerte
  if (inputDataScore >= 7 && inputDataScore - questionScore >= DIFF_THRESHOLD) {
    return InputIntent.INPUT_DATA;
  }

  // Caso 2: CUSTOMER_QUESTION es mucho más fuerte
  if (questionScore >= 8 && questionScore - inputDataScore >= DIFF_THRESHOLD) {
    return InputIntent.CUSTOMER_QUESTION;
  }

  // Caso 3: Ambiguo - usar heurística de fallback
  // Si hay algún dato numérico o fecha/hora, priorizar INPUT_DATA
  if (
    inputDataScore > 0 &&
    (/\b\d+\b/.test(m) || /\b(hoy|mañana|pasado|:\d{2}|am|pm)\b/i.test(m))
  ) {
    return InputIntent.INPUT_DATA;
  }

  // Caso 4: Por defecto, asumir pregunta si no hay datos claros
  return InputIntent.CUSTOMER_QUESTION;
}
