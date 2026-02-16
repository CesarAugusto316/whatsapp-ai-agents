import { fromZonedTime, toZonedTime } from "date-fns-tz";

// === Extracción de fecha/hora ===

export function extractDateTime(
  message: string,
  timezone: string,
  referenceDate: Date,
  averageDurationMinutes: number = 60,
): { startDate: string; startTime: string; endDate: string; endTime: string } {
  const text = message.toLowerCase();

  const startTime = extractStartTime(text);
  const endTime = extractEndTime(text, startTime, averageDurationMinutes);

  const { date } = extractDate(text, referenceDate, timezone);

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
  timezone: string,
): { date: Date | null; isNextWeek: boolean } {
  const zonedRef = toZonedTime(referenceDate, timezone);
  const today = new Date(zonedRef);
  today.setHours(0, 0, 0, 0);

  // Manejo de fechas relativas básicas
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

  // Manejo de fechas semanales y mensuales
  const days = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];

  // Patrones para "la semana que viene X dia"
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
        let diff = (target - current + 7) % 7;
        if (diff === 0) diff = 7; // Si hoy es el día objetivo, ir a la próxima semana
        diff += 7; // Agregar otros 7 días para llegar a la semana siguiente

        const d = new Date(today);
        d.setDate(today.getDate() + diff);
        return { date: d, isNextWeek: true };
      }
    }
  }

  // Manejo de "el proximo X dia"
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
        // Si es el mismo día que hoy, ir a la próxima semana
        if (diff === 0) diff = 7;

        const d = new Date(today);
        d.setDate(today.getDate() + diff);
        return { date: d, isNextWeek: diff > 7 };
      }
    }
  }

  // Manejo de "el X dia del mes proximo"
  const weekDays = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];
  for (let i = 0; i < weekDays.length; i++) {
    const day = weekDays[i];
    const nextMonthPatterns = [
      new RegExp(`el ${day} del mes pr[oó]ximo`, "i"),
      new RegExp(`el ${day} del mes siguiente`, "i"),
      new RegExp(`el ${day} del mes que viene`, "i"),
      new RegExp(`el ${day} del pr[oó]ximo mes`, "i"),
    ];

    if (nextMonthPatterns.some((pattern) => pattern.test(text))) {
      const targetDayIndex = i;
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // Encontrar la primera ocurrencia del día objetivo en el próximo mes
      let candidateDate = new Date(nextMonth);
      candidateDate.setDate(1);

      while (candidateDate.getDay() !== targetDayIndex) {
        candidateDate.setDate(candidateDate.getDate() + 1);
      }

      // Si la fecha encontrada es anterior a la fecha actual, obtener la siguiente ocurrencia
      if (candidateDate < today) {
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

  // Días de la semana (casos generales como "el lunes", "próximo lunes")
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

function extractStartTime(text: string): string {
  const timePatterns = [
    // Patrones para "en punto"
    /(\d{1,2})\s+en\s+punto/i,
    /(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+en\s+punto/i,

    // Otros patrones de tiempo
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

      // Heurística para "en punto" sin AM/PM: asumir PM (7 → 19)
      if (
        text.includes("en punto") &&
        !text.match(/a\.?m\.?|p\.?m\.?/i) &&
        hour >= 1 &&
        hour <= 11
      ) {
        hour += 12;
      }

      // Lógica de detección AM/PM
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
    // Patrones que capturan la SEGUNDA hora de un rango
    const rangePatterns = [
      /(?:entre\s+(?:la\s+)?\d{1,2}.*?y\s+(?:las?\s+)?)(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i,
      /(?:de\s+\d{1,2}.*?a\s+(?:las?\s+)?)(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i,
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

// === Funciones auxiliares ===

function formatDateAsUTC(date: Date, timezone: string): string {
  const utcDate = fromZonedTime(date, timezone);
  return utcDate.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
