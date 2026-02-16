import { z } from "zod";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// Definición del esquema de respuesta
const BookingDataSchema = z
  .object({
    customerName: z.string(),
    datetime: z.object({
      start: z
        .object({
          date: z
            .string()
            // .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(), // formato YYYY-MM-DD
          time: z
            .string()
            // .regex(/^\d{2}:\d{2}:\d{2}$/)
            .optional(), // formato HH:MM:SS
        })
        .partial(),
      end: z
        .object({
          date: z
            .string()
            // .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(), // formato YYYY-MM-DD
          time: z
            .string()
            // .regex(/^\d{2}:\d{2}:\d{2}$/)
            .optional(), // formato HH:MM:SS
        })
        .partial(),
    }),
    numberOfPeople: z.number().int().min(0).max(50),
  })
  .partial();

export type ParsedBookingData = z.infer<typeof BookingDataSchema>;

/**
 * Parsea datos de reserva desde un mensaje de texto en lenguaje natural
 * @param message Mensaje de texto en lenguaje natural
 * @param timezone Zona horaria para interpretar las fechas/tiempos
 * @param referenceDate Fecha de referencia para interpretar fechas relativas (por defecto: fecha actual)
 * @returns Objeto con los datos de reserva parseados
 */
export function parseBookingData(
  message: string,
  timezone: string = "America/Mexico_City",
  referenceDate: Date = new Date(),
  averageDurationMinutes: number = 60, // 👈 nuevo parámetro
): ParsedBookingData {
  const normalizedMessage = message.trim();
  const numberOfPeople = extractNumberOfPeople(normalizedMessage);
  const customerName = extractCustomerName(message);

  const { startDate, startTime, endDate, endTime } = extractDateTime(
    normalizedMessage,
    timezone,
    referenceDate,
    averageDurationMinutes, // 👈 pasarlo
  );

  const result = BookingDataSchema.parse({
    customerName,
    datetime: {
      start: { date: startDate, time: startTime },
      end: { date: endDate, time: endTime },
    },
    numberOfPeople,
  });

  return result;
}

// === Funciones auxiliares de parsing (sin cambios funcionales) ===

function extractNumberOfPeople(message: string): number {
  // ... (igual que antes, sin cambios necesarios aquí)
  const text = message.toLowerCase();
  const patterns = [
    /(?:mesa|reserva|cita|evento)\s+para\s+(\d+)/i,
    /(?:para|de|con|grupo de|somos|vamos a ser|vamos|total|reserva para)\s*(\d+)\s*(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i,
    /(\d+)\s*(?:adultos?|niños?|menores?|bebes?|bebés?)/i,
    /^(\d+)\s*(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i,
    /(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)\s*(\d+)$/i,
    /(?:somos|serán|vamos a ser|vamos|va a ir|van a ir|irá|irán)\s*(\d+)/i,
    /(?:pa'|pa)\s*(\d+)\s*(?:personas?|pers|...)/i,
    /(\d+)\s*(?:pa'|pa)\s*/i,
    /(\d+)\s+(?:chamacos?|pelados?|...)/i,
    /(?:vamos|somos|...)\s+p[ao]'?\s*(\d+)(?:\s+el\s+\w+\s+parce|...)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0 && num <= 50) return num;
    }
  }

  const regionalTerms = [
    "chamacos?",
    "pelados?",
    "fiambres?",
    "tíos?",
    "compas?",
    "parce",
    "panas?",
    "muchachos?",
    "cuates?",
    "hermanos?",
    "amigos?",
    "colegas?",
    "compadres?",
    "quilombos?",
    "pibes?",
    "güeyes?",
    "camaradas?",
    "cuate.s?",
    "principes?",
    "reyes?",
    "capos?",
    "jefes?",
    "compis?",
    "hermano",
  ];
  for (const term of regionalTerms) {
    const reg = new RegExp(`(\\d+)\\s+${term}|${term}\\s+(\\d+)`, "i");
    const m = text.match(reg);
    if (m) {
      const n = parseInt(m[1] || m[2], 10);
      if (!isNaN(n) && n > 0 && n <= 50) return n;
    }
  }

  const vamosPattern = /(?:vamos|somos|...)\s+pa'?s*\s*(\d+)/i;
  const vm = text.match(vamosPattern);
  if (vm?.[1]) {
    const n = parseInt(vm[1], 10);
    if (!isNaN(n) && n > 0 && n <= 50) return n;
  }

  const generalPatterns = [
    /grupo de (\d+) personas/i,
    /equipo de (\d+) personas/i,
    /familia de (\d+) personas/i,
    /evento de (\d+) personas/i,
    /celebraci[oó]n de (\d+) personas/i,
    /(\d+) personas/i,
    /(\d+) comensales/i,
    /(\d+) invitados/i,
    /(\d+) huespedes/i,
    /(\d+) huéspedes/i,
  ];
  for (const p of generalPatterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > 0 && n <= 50) return n;
    }
  }

  if (text.includes("solo") || text.includes("solos")) {
    if (text.includes("dos") || text.includes("2")) return 2;
    if (text.includes("uno") || text.includes("1")) return 1;
  }

  return 0;
}

function extractCustomerName(message: string): string {
  const namePattern =
    /[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,}(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,})*/g;
  const matches = message.match(namePattern) || [];
  const commonWords = [
    "Hola",
    "Buen",
    "Buenos",
    "Buenas",
    "Gracias",
    "Por",
    "Para",
    "Con",
    "De",
    "La",
    "El",
    "Las",
    "Los",
    "Del",
    "Al",
    "A",
    "En",
    "Y",
    "O",
    "Si",
    "No",
    "Que",
    "Es",
    "Se",
    "Te",
    "Me",
    "Le",
    "Les",
    "Da",
    "Dan",
    "Doy",
    "Dio",
    "Dieron",
    "Hoy",
    "Mañana",
    "Tarde",
    "Noche",
    "Mesa",
    "Reserva",
    "Personas",
    "Para",
    "Ellos",
    "Ellas",
    "Usted",
    "Ustedes",
  ];
  const names = matches.filter((n) => !commonWords.includes(n));
  return names.length > 0 ? names[0] : "";
}

// === Extracción de fecha/hora (CORREGIDA) ===

function extractDateTime(
  message: string,
  timezone: string,
  referenceDate: Date,
  averageDurationMinutes: number = 60, // 👈 nuevo parámetro
): { startDate: string; startTime: string; endDate: string; endTime: string } {
  const text = message.toLowerCase();

  const startTime = extractStartTime(text);
  const endTime = extractEndTime(text, startTime, averageDurationMinutes); // 👈

  // ✅ Ahora pasamos `timezone` a `extractDate`
  const { date, isNextWeek } = extractDate(text, referenceDate, timezone);

  if (date) {
    const startDate = formatDateAsUTC(date, timezone);
    const endDateObj = startTime > endTime ? addDays(date, 1) : date;
    const endDate = formatDateAsUTC(endDateObj, timezone);
    return { startDate, startTime, endDate, endTime };
  }

  return { startDate: "", startTime, endDate: "", endTime };
}

function extractDate(
  text: string,
  referenceDate: Date,
  timezone: string, // ✅ Añadido
): { date: Date | null; isNextWeek: boolean } {
  // ✅ Construimos la fecha base en la zona horaria dada
  const zonedRef = toZonedTime(referenceDate, timezone);
  const today = new Date(zonedRef);
  today.setHours(0, 0, 0, 0);

  // ✅ Corregimos precedencia: "pasado mañana" ANTES que "mañana"
  if (text.includes("pasado mañana")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return { date: d, isNextWeek: false };
  }

  if (text.includes("mañana")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return { date: d, isNextWeek: false };
  }

  if (text.includes("hoy")) {
    return { date: today, isNextWeek: false };
  }

  // Handle "la semana que viene X dia" and "el proximo X dia"
  const days = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];

  // Patterns for next week: "la semana que viene X dia", "la próxima semana X dia"
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const nextWeekPatterns = [
      new RegExp(`la semana que viene ${day}`, "i"),
      new RegExp(`la pr[oó]xima semana ${day}`, "i"),
      new RegExp(`el ${day} de la semana que viene`, "i"),
      new RegExp(`el ${day} de la pr[oó]xima semana`, "i"),
    ];

    for (const pattern of nextWeekPatterns) {
      if (pattern.test(text)) {
        const target = i;
        const current = today.getDay();
        // Find the next occurrence of this day, then add 7 more days for next week
        let diff = (target - current + 7) % 7;
        if (diff === 0) diff = 7; // If today is the target day, go to next week
        diff += 7; // Add another 7 days to get to the following week

        const d = new Date(today);
        d.setDate(today.getDate() + diff);
        return { date: d, isNextWeek: true };
      }
    }
  }

  // Enhanced handling for "el proximo X dia" - ensure it goes to the next occurrence even if it's today
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const nextDayPatterns = [
      new RegExp(`el pr[oó]ximo ${day}`, "i"),
      new RegExp(`el proximo ${day}`, "i"),
    ];

    for (const pattern of nextDayPatterns) {
      if (pattern.test(text)) {
        const target = i;
        const current = today.getDay();
        let diff = (target - current + 7) % 7;
        // If it's the same day as today, go to the next week's occurrence
        if (diff === 0) diff = 7;

        const d = new Date(today);
        d.setDate(today.getDate() + diff);
        return { date: d, isNextWeek: diff > 7 };
      }
    }
  }

  // Handle "el X dia del mes proximo" (the X day of next month)
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const nextMonthPatterns = [
      new RegExp(`el ${day} del mes pr[oó]ximo`, "i"),
      new RegExp(`el ${day} del mes siguiente`, "i"),
      new RegExp(`el ${day} del mes que viene`, "i"),
      new RegExp(`el ${day} del pr[oó]ximo mes`, "i"),
    ];

    if (nextMonthPatterns.some((pattern) => pattern.test(text))) {
      // Find the next occurrence of this day in the next month
      const targetDayIndex = i;
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // Find the first occurrence of the target day in the next month
      let candidateDate = new Date(nextMonth);
      // Adjust to the first day of the month
      candidateDate.setDate(1);

      // Find the first occurrence of the target day of the week
      while (candidateDate.getDay() !== targetDayIndex) {
        candidateDate.setDate(candidateDate.getDate() + 1);
      }

      // If the found date is before the current date, get the next occurrence
      if (candidateDate < today) {
        // Add 7 days to get the next occurrence
        candidateDate.setDate(candidateDate.getDate() + 7);
      }

      return { date: candidateDate, isNextWeek: false };
    }
  }

  // Fechas absolutas (DD/MM/YYYY, etc.)
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let [, first, second, yearStr] = match;
      let day, month;
      let fullYear = parseInt(yearStr, 10);
      if (fullYear < 100) fullYear += 2000;

      if (parseInt(first, 10) > 12) {
        day = parseInt(first, 10);
        month = parseInt(second, 10);
      } else if (parseInt(second, 10) > 12) {
        day = parseInt(second, 10);
        month = parseInt(first, 10);
      } else {
        day = parseInt(first, 10);
        month = parseInt(second, 10);
      }

      const parsed = new Date(fullYear, month - 1, day);
      if (parsed < today) {
        parsed.setFullYear(parsed.getFullYear() + 1);
      }
      return { date: parsed, isNextWeek: false };
    }
  }

  // "viernes 12 de abril"
  const weekdayMonthDayPattern =
    /(lunes|martes|miércoles|jueves|viernes|sábado|domingo)[\s\S]*?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
  const wmdMatch = text.match(weekdayMonthDayPattern);
  if (wmdMatch) {
    const [, , dayStr, monthStr] = wmdMatch;
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const mi = months.findIndex((m) => m === monthStr.toLowerCase());
    const day = parseInt(dayStr, 10);
    let d = new Date(today.getFullYear(), mi, day);
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return { date: d, isNextWeek: false };
  }

  // "12 de abril"
  const dayMonthPattern = /(\d{1,2})\s+de\s+(enero|...|diciembre)/i;
  const dmMatch = text.match(dayMonthPattern);
  if (dmMatch) {
    const [, dayStr, monthStr] = dmMatch;
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const mi = months.findIndex((m) => m === monthStr.toLowerCase());
    const day = parseInt(dayStr, 10);
    let d = new Date(today.getFullYear(), mi, day);
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return { date: d, isNextWeek: false };
  }

  // Días de la semana (fallback for simple cases like "el lunes", "próximo lunes")
  for (let i = 0; i < days.length; i++) {
    const re = new RegExp(`(?:pr[oó]ximo\\s+|el\\s+)?${days[i]}`, "i");
    if (re.test(text)) {
      const target = i;
      const current = today.getDay();
      let diff = (target - current + 7) % 7;
      if (text.includes("próximo") || text.includes("proximo")) {
        if (diff === 0) diff = 7;
      } else {
        if (diff === 0) diff = 7;
      }
      const d = new Date(today);
      d.setDate(today.getDate() + diff);
      return { date: d, isNextWeek: diff > 7 };
    }
  }

  return { date: null, isNextWeek: false };
}

// === Horas (sin cambios necesarios) ===

function extractStartTime(text: string): string {
  const timePatterns = [
    // 👈🏼 PATRONES MINIMALES PARA "EN PUNTO" (agregar ESTAS 2 líneas al inicio)
    /(\d{1,2})\s+en\s+punto/i,
    /(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+en\s+punto/i,

    // ... resto de tus patrones existentes SIN CAMBIOS ...
    /entre\s+la\s+(\d{1,2})(?::(\d{2}))?\s*(?:a\.?m\.?|p\.?m\.?)?\s+y\s+las?\s+\d/i,
    /entre\s+(\d{1,2})(?::(\d{2}))?\s*(?:a\.?m\.?|p\.?m\.?)?\s+y\s+las?\s+\d/i,
    /de\s+(\d{1,2})(?::(\d{2}))?\s*(?:a\.?m\.?|p\.?m\.?)?\s+a\s+\d/i,
    /de\s+(\d{1,2})(?::(\d{2}))?\s*(?:a\.?m\.?|p\.?m\.?)?\s+hasta\s+\d/i,
    /de\s+(\d{1,2})\s*(?:a\.?m\.?|p\.?m\.?)?\s+a\s+\d/i,
    /(?:a\s+las?|desde|inicio|comienza|empieza|reunión|cita|reserva|entrada)\s+(\d{1,2}):(\d{2})\s*(?:a\.?m\.?|p\.?m\.?)/i,
    /(?:a\s+las?|desde|inicio|comienza|empieza|reunión|cita|reserva|entrada)\s+(\d{1,2})\s*(?:a\.?m\.?|p\.?m\.?)/i,
    /(\d{1,2}):(\d{2})\s*(?:a\.?m\.?|p\.?m\.?)/i,
    /(?:a\s+las?|desde|inicio|comienza|empieza|reunión|cita|reserva|entrada)\s+(\d{1,2}):(\d{2})/i,
    /(?:a\s+las?|desde|inicio|comienza|empieza|reunión|cita|reserva|entrada)\s+(\d{1,2})\s*(?:hrs?|horas?)/i,
    /(\d{1,2}):(\d{2})/i,
    /(\d{1,2})\s*(?:a\.?m\.?|p\.?m\.?)/i,
    /(?:a\s+las?|desde|inicio|comienza|empieza)\s+(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)(?:\s+(?:treinta|media))?/i,
    /(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)(?:\s+(?:treinta|media))?\s*(?:a\.?m\.?|p\.?m\.?)/i,
  ];

  // ... resto de tu función SIN CAMBIOS (incluyendo hourWords y lógica de AM/PM) ...
  const hourWords: Record<string, number> = {
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
  };

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hourStr = match[1];
      const minuteStr = match[2] || "00";

      let hour = parseInt(hourStr, 10);
      if (isNaN(hour) && hourWords[hourStr.toLowerCase()]) {
        hour = hourWords[hourStr.toLowerCase()];
      }

      // 👈🏼 HEURÍSTICA MÍNIMA para "en punto" SIN AM/PM: asumir PM (7 → 19)
      if (
        text.includes("en punto") &&
        !text.match(/a\.?m\.?|p\.?m\.?/i) &&
        hour >= 1 &&
        hour <= 11
      ) {
        hour += 12;
      }

      // ... tu lógica existente de detección AM/PM SIN CAMBIOS ...
      const allAmpmMatches = text.match(
        /(\d{1,2}(?::\d{2})?|\b(?:una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b)\s*(a\.?m\.?|p\.?m\.?)/gi,
      );
      if (allAmpmMatches) {
        for (const matchText of allAmpmMatches) {
          const hourPart = matchText.match(
            /(\d{1,2}(?::\d{2})?|\b(?:una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b)/i,
          );
          if (hourPart) {
            let matchHour = parseInt(hourPart[1], 10);
            if (isNaN(matchHour)) {
              const wordHour = hourPart[1].toLowerCase().trim();
              matchHour = hourWords[wordHour];
            }

            if (matchHour === hour) {
              const ampm = matchText
                .match(/(a\.?m\.?|p\.?m\.?)/i)?.[1]
                ?.toLowerCase();
              if (ampm?.includes("p") && hour < 12) {
                hour += 12;
              } else if (ampm?.includes("a") && hour === 12) {
                hour = 0;
              }
              break;
            }
          }
        }
      }

      return `${hour.toString().padStart(2, "0")}:${minuteStr.padStart(2, "0")}:00`;
    }
  }
  return "";
}

function extractEndTime(
  text: string,
  startTime: string,
  averageDurationMinutes: number = 60,
): string {
  if (!startTime) return "";

  // Solo procesar endTime si hay indicadores claros de RANGO HORARIO
  const hasRange = /(?:entre|de\s+\d.*a\s+\d|desde\s+\d.*hasta)/i.test(text);

  if (hasRange) {
    // Patrones que EXPLÍCITAMENTE capturan la SEGUNDA hora de un rango
    const rangePatterns = [
      // "entre X y Y" → captura Y
      /(?:entre\s+(?:la\s+)?\d{1,2}.*?y\s+(?:las?\s+)?)(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i,

      // "de X a Y" → captura Y
      /(?:de\s+\d{1,2}.*?a\s+(?:las?\s+)?)(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i,

      // "desde X hasta Y" → captura Y
      /(?:desde\s+\d{1,2}.*?hasta\s+(?:las?\s+)?)(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i,
    ];

    for (const pattern of rangePatterns) {
      const match = text.match(pattern);
      if (match) {
        let hourStr = match[1];
        const minuteStr = match[2] || "00";
        let hour = parseInt(hourStr, 10);

        const hourWords: Record<string, number> = {
          una: 1,
          dos: 2,
          tres: 3,
          cuatro: 4,
          cinco: 5,
          seis: 6,
          siete: 7,
          ocho: 8,
          nueve: 9,
          diez: 10,
          once: 11,
          doce: 12,
        };

        if (isNaN(hour) && hourWords[hourStr.toLowerCase()]) {
          hour = hourWords[hourStr.toLowerCase()];
        }

        let ampm = match[3]?.toLowerCase();
        if (!ampm) {
          // Buscar AM/PM cerca de esta hora específica
          const contextStart = match.index! + match[0].length - 20;
          const context = text
            .slice(contextStart)
            .match(/(a\.?m\.?|p\.?m\.?)/i);
          ampm = context?.[1]?.toLowerCase() ?? "";
        }

        if (ampm?.includes("p") && hour < 12) hour += 12;
        else if (ampm?.includes("a") && hour === 12) hour = 0;

        return `${hour.toString().padStart(2, "0")}:${minuteStr.padStart(2, "0")}:00`;
      }
    }
  }

  // Si no hay rango explícito, usar duración promedio
  const [h, m] = startTime.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "";

  let totalMinutes = h * 60 + m + averageDurationMinutes;
  let endH = Math.floor(totalMinutes / 60) % 24;
  let endM = totalMinutes % 60;

  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}:00`;
}

// === NUEVA función de formateo UTC (correcta) ===

function formatDateAsUTC(date: Date, timezone: string): string {
  // `date` representa una fecha en `timezone` (ej. "2026-02-15" en México)
  // Queremos el día UTC correspondiente → convertimos a UTC
  const utcDate = fromZonedTime(date, timezone);
  return utcDate.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
