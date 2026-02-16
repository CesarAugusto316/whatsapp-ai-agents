import { fromZonedTime, toZonedTime } from "date-fns-tz";

// Constants
const DAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

// Misspelling-tolerant regex patterns for days of the week
const DAY_VARIANTS = [
  /d[oó]?m[ií]?ng[oó]?/, // "domingo" with potential misspellings: "domgo", "domingo", "domingoo", etc.
  /l[eu]?n[ae]?s?/, // "lunes" with potential misspellings: "lun", "lunes", "luness", etc.
  /m[ae]?rt[ae]?s?/, // "martes" with potential misspellings: "mart", "martes", "martess", etc.
  /m[ií]?[eé]?rc[oe]?s?|m[ií]?[eé]?rcole[sz]?|m[ií]?[eé]?rcoled?/, // "miércoles" with potential misspellings: "miercoles", "miercoless", "mircoles", etc.
  /j[eu]?[eé]?v[ae]?s?/, // "jueves" with potential misspellings: "juev", "jueves", "juevess", etc.
  /v[ií]?[eé]?rn[ae]?s?/, // "viernes" with potential misspellings: "viern", "viernes", "vierness", etc.
  /s[ae]?b[aá]?d[oó]?/, // "sábado" with potential misspellings: "sabad", "sabadoo", "sabado", etc.
];

const MONTHS = [
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

const HOUR_WORDS: Record<string, number> = {
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

  // Check relative dates first
  const relativeResult = checkRelativeDates(text, today);
  if (relativeResult.date) {
    return relativeResult;
  }

  // Check weekday patterns
  const weekdayResult = checkWeekdayPatterns(text, today);
  if (weekdayResult.date) {
    return weekdayResult;
  }

  // Check month patterns
  const monthResult = checkMonthPatterns(text, today);
  if (monthResult.date) {
    return monthResult;
  }

  // Check absolute dates
  const absoluteResult = checkAbsoluteDates(text, today);
  if (absoluteResult.date) {
    return absoluteResult;
  }

  return { date: null, isNextWeek: false };
}

// Check relative dates: "hoy", "mañana", "pasado mañana"
function checkRelativeDates(
  text: string,
  today: Date,
): { date: Date | null; isNextWeek: boolean } {
  if (text.includes("pasado mañana")) {
    const date = new Date(today);
    date.setDate(today.getDate() + 2);
    date.setHours(0, 0, 0, 0);
    return { date, isNextWeek: false };
  }

  if (text.includes("mañana")) {
    const date = new Date(today);
    date.setDate(today.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return { date, isNextWeek: false };
  }

  if (text.includes("hoy")) {
    return { date: today, isNextWeek: false };
  }

  return { date: null, isNextWeek: false };
}

// Check weekday patterns: "la semana que viene lunes", "el proximo martes", etc.
function checkWeekdayPatterns(
  text: string,
  today: Date,
): { date: Date | null; isNextWeek: boolean } {
  // Check "la semana que viene X dia" with misspelling tolerance
  for (let i = 0; i < DAYS.length; i++) {
    const day = DAYS[i];
    // Create variants of the day name to handle common misspellings
    const dayVariant = day.replace(/([aeiou])/g, "$1{0,2}"); // Allow repeated vowels
    const nextWeekPatterns = [
      new RegExp(`la semana que viene ${dayVariant}`, "i"),
      new RegExp(`la pr[oó]xim[ae] semana ${dayVariant}`, "i"), // Allow 'a' in addition to 'o'
      new RegExp(`el ${dayVariant} de la semana que viene`, "i"),
      new RegExp(`el ${dayVariant} de la pr[oó]xim[ae] semana`, "i"),
      // Additional regional expressions for LatAm and Spain
      new RegExp(`la pr[oó]xim[ae] semana que viene ${dayVariant}`, "i"),
      new RegExp(`la semana pr[oó]xim[ae] ${dayVariant}`, "i"),
      new RegExp(`la semana entrante ${dayVariant}`, "i"),
      new RegExp(`la semana siguiente ${dayVariant}`, "i"),
      new RegExp(`la semana despu[eé]s ${dayVariant}`, "i"),
      new RegExp(`el ${dayVariant} que viene en la semana`, "i"),
      new RegExp(`el ${dayVariant} de la semana siguiente`, "i"),
      new RegExp(`el ${dayVariant} de la semana entrante`, "i"),
      new RegExp(`el ${dayVariant} de la semana despu[eé]s`, "i"),
      new RegExp(`el ${dayVariant} de la semana pr[oó]xim[ae]`, "i"),
    ];

    for (const pattern of nextWeekPatterns) {
      if (pattern.test(text)) {
        const target = i;
        const current = today.getDay();
        let diff = (target - current + 7) % 7;
        if (diff === 0) diff = 7; // If today is the target day, go to next week
        diff += 7; // Add another 7 days to reach the following week

        const date = new Date(today);
        date.setDate(today.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return { date, isNextWeek: true };
      }
    }

    // Additional patterns with misspelling tolerance (preserving original functionality)
    const dayVariantTolerant = day.replace(/([aeiou])/g, "$1{0,1}"); // Allow one extra vowel at most
    const tolerantPatterns = [
      new RegExp(
        `l[ae]?\s*sem[aá]?n[ae]?\s*qu[ei]?\s*vien[es]?s?\s*${dayVariantTolerant}`,
        "i",
      ), // "la semana que viene" with misspellings
      new RegExp(
        `l[ae]?\s*pr[oó]?xim[ae]?\s*sem[aá]?n[ae]?\s*${dayVariantTolerant}`,
        "i",
      ), // "la proxima semana" with misspellings
      new RegExp(
        `el\s*${dayVariantTolerant}\s*d[ei]?\s*l[ae]?\s*sem[aá]?n[ae]?\s*qu[ei]?\s*vien[es]?s?`,
        "i",
      ), // "el X de la semana que viene" with misspellings
      new RegExp(
        `el\s*${dayVariantTolerant}\s*d[ei]?\s*l[ae]?\s*pr[oó]?xim[ae]?\s*sem[aá]?n[ae]?`,
        "i",
      ), // "el X de la proxima semana" with misspellings
    ];

    for (const pattern of tolerantPatterns) {
      if (pattern.test(text)) {
        const target = i;
        const current = today.getDay();
        let diff = (target - current + 7) % 7;
        if (diff === 0) diff = 7; // If today is the target day, go to next week
        diff += 7; // Add another 7 days to reach the following week

        const date = new Date(today);
        date.setDate(today.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return { date, isNextWeek: true };
      }
    }
  }

  // Check "el proximo X dia" with misspelling tolerance
  for (let i = 0; i < DAYS.length; i++) {
    const day = DAYS[i];
    // Create variants of the day name to handle common misspellings
    const dayVariant = day.replace(/([aeiou])/g, "$1{0,2}"); // Allow repeated vowels
    const nextDayPatterns = [
      new RegExp(`el pr[oó]xim[oe] ${dayVariant}`, "i"),
      new RegExp(`el proxim[oe] ${dayVariant}`, "i"),
      // Additional regional expressions for LatAm and Spain
      new RegExp(`el siguiente ${dayVariant}`, "i"),
      new RegExp(`el que sigue ${dayVariant}`, "i"),
      new RegExp(`el que viene ${dayVariant}`, "i"),
      new RegExp(`el otro ${dayVariant}`, "i"), // "el otro lunes" - common in some regions
      new RegExp(`el pr[oó]xim[oe] d[ií]a ${dayVariant}`, "i"),
      new RegExp(`el d[ií]a pr[oó]xim[oe] ${dayVariant}`, "i"),
      new RegExp(`el d[ií]a siguiente ${dayVariant}`, "i"),
      new RegExp(`el d[ií]a que viene ${dayVariant}`, "i"),
      new RegExp(`el d[ií]a despu[eé]s ${dayVariant}`, "i"),
      new RegExp(`el ${dayVariant} pr[oó]xim[oe]`, "i"),
      new RegExp(`el ${dayVariant} siguiente`, "i"),
      new RegExp(`el ${dayVariant} que viene`, "i"),
      new RegExp(`el ${dayVariant} que sigue`, "i"),
      new RegExp(`el ${dayVariant} despu[eé]s`, "i"),
    ];

    for (const pattern of nextDayPatterns) {
      if (pattern.test(text)) {
        const target = i;
        const current = today.getDay();
        let diff = (target - current + 7) % 7;
        // If it's the same day as today, go to the next week
        if (diff === 0) diff = 7;

        const date = new Date(today);
        date.setDate(today.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return { date, isNextWeek: diff > 7 };
      }
    }

    // Additional patterns with enhanced misspelling tolerance (preserving original functionality)
    const dayVariantTolerant = day.replace(/([aeiou])/g, "$1{0,1}"); // Allow one extra vowel at most
    const tolerantNextDayPatterns = [
      new RegExp(`el\s*pr[oó]?xim[oe]?\s*${dayVariantTolerant}`, "i"),
      new RegExp(`el\s*proxim[oe]?\s*${dayVariantTolerant}`, "i"),
      // Additional regional expressions with misspelling tolerance
      new RegExp(`el\s*sigui[ei]?nt[ei]?s?\s*${dayVariantTolerant}`, "i"),
      new RegExp(`el\s*qu[ei]?\s*s[ií]?g[ue]?\s*${dayVariantTolerant}`, "i"),
      new RegExp(`el\s*qu[ei]?\s*vien[es]?\s*${dayVariantTolerant}`, "i"),
      new RegExp(`el\s*otr[oe]?\s*${dayVariantTolerant}`, "i"), // "el otro lunes" with misspelling tolerance
      new RegExp(
        `el\s*pr[oó]?xim[oe]?\s*d[ií]?[ae]?s?\s*${dayVariantTolerant}`,
        "i",
      ),
      new RegExp(
        `el\s*d[ií]?[ae]?s?\s*pr[oó]?xim[oe]?\s*${dayVariantTolerant}`,
        "i",
      ),
      new RegExp(
        `el\s*d[ií]?[ae]?s?\s*sigui[ei]?nt[ei]?s?\s*${dayVariantTolerant}`,
        "i",
      ),
      new RegExp(
        `el\s*d[ií]?[ae]?s?\s*qu[ei]?\s*vien[es]?\s*${dayVariantTolerant}`,
        "i",
      ),
      new RegExp(
        `el\s*d[ií]?[ae]?s?\s*d[ei]?spu[eé]?s?\s*${dayVariantTolerant}`,
        "i",
      ),
      new RegExp(`el\s*${dayVariantTolerant}\s*pr[oó]?xim[oe]?`, "i"),
      new RegExp(`el\s*${dayVariantTolerant}\s*sigui[ei]?nt[ei]?`, "i"),
      new RegExp(`el\s*${dayVariantTolerant}\s*qu[ei]?\s*vien[es]?`, "i"),
      new RegExp(`el\s*${dayVariantTolerant}\s*qu[ei]?\s*s[ií]?g[ue]?`, "i"),
      new RegExp(`el\s*${dayVariantTolerant}\s*d[ei]?spu[eé]?s?`, "i"),
      // Even more misspelling tolerant versions
      new RegExp(`el\s*[sz]igui[ei]?ent[ei]?s?\s*${dayVariantTolerant}`, "i"), // "siguiente" with potential 'z' instead of 'c'
      new RegExp(
        `el\s*d[ií]?[ae]?s?\s*[sz]igui[ei]?ent[ei]?s?\s*${dayVariantTolerant}`,
        "i",
      ), // "día siguiente" with potential 'z' instead of 'c'
    ];

    for (const pattern of tolerantNextDayPatterns) {
      if (pattern.test(text)) {
        const target = i;
        const current = today.getDay();
        let diff = (target - current + 7) % 7;
        // If it's the same day as today, go to the next week
        if (diff === 0) diff = 7;

        const date = new Date(today);
        date.setDate(today.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return { date, isNextWeek: diff > 7 };
      }
    }
  }

  // Check "el X dia del mes proximo" with misspelling tolerance
  for (let i = 0; i < DAYS.length; i++) {
    const day = DAYS[i];
    // Create variants of the day name to handle common misspellings
    const dayVariant = day.replace(/([aeiou])/g, "$1{0,2}"); // Allow repeated vowels
    const nextMonthPatterns = [
      new RegExp(`el ${dayVariant} del mes pr[oó]xim[oe]`, "i"),
      new RegExp(`el ${dayVariant} del mes siguient[ei]`, "i"),
      new RegExp(`el ${dayVariant} del mes qu[ei] vien[es]`, "i"),
      new RegExp(`el ${dayVariant} del pr[oó]xim[oe] mes`, "i"),
    ];

    if (nextMonthPatterns.some((pattern) => pattern.test(text))) {
      const targetDayIndex = i;
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // Find the first occurrence of the target day in the next month
      let candidateDate = new Date(nextMonth);
      candidateDate.setDate(1);

      while (candidateDate.getDay() !== targetDayIndex) {
        candidateDate.setDate(candidateDate.getDate() + 1);
      }

      // If the found date is before the current date, get the next occurrence
      if (candidateDate < today) {
        candidateDate.setDate(candidateDate.getDate() + 7);
      }

      candidateDate.setHours(0, 0, 0, 0);
      return { date: candidateDate, isNextWeek: false };
    }

    // Additional patterns with enhanced misspelling tolerance (preserving original functionality)
    const dayVariantTolerant = day.replace(/([aeiou])/g, "$1{0,1}"); // Allow one extra vowel at most
    const tolerantNextMonthPatterns = [
      new RegExp(
        `el\s*${dayVariantTolerant}\s*d[ei]l?\s*m[ei]s?\s*pr[oó]?xim[oe]?`,
        "i",
      ),
      new RegExp(
        `el\s*${dayVariantTolerant}\s*d[ei]l?\s*m[ei]s?\s*sigui[ei]?nt[ei]?`,
        "i",
      ),
      new RegExp(
        `el\s*${dayVariantTolerant}\s*d[ei]l?\s*m[ei]s?\s*qu[ei]?\s*vien[es]?`,
        "i",
      ),
      new RegExp(
        `el\s*${dayVariantTolerant}\s*d[ei]l?\s*pr[oó]?xim[oe]?\s*m[ei]s?`,
        "i",
      ),
      // Even more misspelling tolerant versions
      new RegExp(
        `el\s*${dayVariantTolerant}\s*d[ei]?\s*m[ei]s?\s*[sz]iguient[ei]?`,
        "i",
      ), // "siguiente" with potential 'z' instead of 'c'
      new RegExp(
        `el\s*${dayVariantTolerant}\s*[sz]iguient[ei]?\s*m[ei]s?`,
        "i",
      ), // "siguiente mes" with potential 'z' instead of 'c'
    ];

    if (tolerantNextMonthPatterns.some((pattern) => pattern.test(text))) {
      const targetDayIndex = i;
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // Find the first occurrence of the target day in the next month
      let candidateDate = new Date(nextMonth);
      candidateDate.setDate(1);

      while (candidateDate.getDay() !== targetDayIndex) {
        candidateDate.setDate(candidateDate.getDate() + 1);
      }

      // If the found date is before the current date, get the next occurrence
      if (candidateDate < today) {
        candidateDate.setDate(candidateDate.getDate() + 7);
      }

      candidateDate.setHours(0, 0, 0, 0);
      return { date: candidateDate, isNextWeek: false };
    }
  }

  // Check general weekdays: "el lunes", "próximo lunes" with misspelling tolerance
  for (let i = 0; i < DAYS.length; i++) {
    const day = DAYS[i];
    // Create variants of the day name to handle common misspellings
    const dayVariant = day.replace(/([aeiou])/g, "$1{0,2}"); // Allow repeated vowels
    const re = new RegExp(`(?:pr[oó]xim[oe]\\s+|l[ae]\\s+)?${dayVariant}`, "i");
    if (re.test(text)) {
      const target = i;
      const current = today.getDay();
      let diff = (target - current + 7) % 7;
      if (
        text.includes("próximo") ||
        text.includes("proximo") ||
        text.includes("proxim")
      ) {
        if (diff === 0) diff = 7;
      } else {
        if (diff === 0) diff = 7;
      }
      const date = new Date(today);
      date.setDate(today.getDate() + diff);
      date.setHours(0, 0, 0, 0);
      return { date, isNextWeek: diff > 7 };
    }
  }

  // Fallback: Check for misspelled day names using DAY_VARIANTS as a last resort
  for (let i = 0; i < DAY_VARIANTS.length; i++) {
    const dayRegex = DAY_VARIANTS[i];

    // Check for "la semana que viene X dia" with misspelled day names
    const nextWeekPatterns = [
      new RegExp(`la semana que viene ${dayRegex.source}`, "i"),
      new RegExp(`la pr[oó]xima semana ${dayRegex.source}`, "i"),
      new RegExp(`el ${dayRegex.source} de la semana que viene`, "i"),
      new RegExp(`el ${dayRegex.source} de la pr[oó]xima semana`, "i"),
    ];

    for (const pattern of nextWeekPatterns) {
      if (pattern.test(text)) {
        const target = i;
        const current = today.getDay();
        let diff = (target - current + 7) % 7;
        if (diff === 0) diff = 7; // If today is the target day, go to next week
        diff += 7; // Add another 7 days to reach the following week

        const date = new Date(today);
        date.setDate(today.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return { date, isNextWeek: true };
      }
    }

    // Check for "el proximo X dia" with misspelled day names
    const nextDayPatterns = [
      new RegExp(`el pr[oó]xim[oe] ${dayRegex.source}`, "i"),
      new RegExp(`el proxim[oe] ${dayRegex.source}`, "i"),
      new RegExp(`el ${dayRegex.source}`, "i"),
      // Additional regional expressions
      new RegExp(`el siguient[ei] ${dayRegex.source}`, "i"),
      new RegExp(`el qu[ei] vien[es] ${dayRegex.source}`, "i"),
      new RegExp(`el otr[oe] ${dayRegex.source}`, "i"), // "el otro lunes" - common in some regions
    ];

    for (const pattern of nextDayPatterns) {
      if (pattern.test(text)) {
        const target = i;
        const current = today.getDay();
        let diff = (target - current + 7) % 7;
        // If it's the same day as today, go to the next week
        if (diff === 0) diff = 7;

        const date = new Date(today);
        date.setDate(today.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return { date, isNextWeek: diff > 7 };
      }
    }

    // Check for "el X dia del mes proximo" with misspelled day names
    const nextMonthPatterns = [
      new RegExp(`el ${dayRegex.source} del mes pr[oó]ximo`, "i"),
      new RegExp(`el ${dayRegex.source} del mes siguient[ei]`, "i"),
      new RegExp(`el ${dayRegex.source} del mes qu[ei] vien[es]`, "i"),
      new RegExp(`el ${dayRegex.source} del pr[oó]ximo mes`, "i"),
    ];

    if (nextMonthPatterns.some((pattern) => pattern.test(text))) {
      const targetDayIndex = i;
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // Find the first occurrence of the target day in the next month
      let candidateDate = new Date(nextMonth);
      candidateDate.setDate(1);

      while (candidateDate.getDay() !== targetDayIndex) {
        candidateDate.setDate(candidateDate.getDate() + 1);
      }

      // If the found date is before the current date, get the next occurrence
      if (candidateDate < today) {
        candidateDate.setDate(candidateDate.getDate() + 7);
      }

      candidateDate.setHours(0, 0, 0, 0);
      return { date: candidateDate, isNextWeek: false };
    }
  }

  return { date: null, isNextWeek: false };
}

// Check month patterns: "viernes 12 de abril", "12 de abril"
function checkMonthPatterns(
  text: string,
  today: Date,
): { date: Date | null; isNextWeek: boolean } {
  // Check "viernes 12 de abril"
  const weekdayMonthDayPattern =
    /(lunes|martes|miércoles|jueves|viernes|sábado|domingo)[\s\S]*?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
  const wmdMatch = text.match(weekdayMonthDayPattern);
  if (wmdMatch) {
    const [, , dayStr, monthStr] = wmdMatch;
    const monthIndex = MONTHS.findIndex((m) => m === monthStr.toLowerCase());
    const day = parseInt(dayStr, 10);
    let date = new Date(today.getFullYear(), monthIndex, day);
    if (date < today) date.setFullYear(date.getFullYear() + 1);
    date.setHours(0, 0, 0, 0);
    return { date, isNextWeek: false };
  }

  // Check "12 de abril"
  const dayMonthPattern =
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
  const dmMatch = text.match(dayMonthPattern);
  if (dmMatch) {
    const [, dayStr, monthStr] = dmMatch;
    const monthIndex = MONTHS.findIndex((m) => m === monthStr.toLowerCase());
    const day = parseInt(dayStr, 10);
    let date = new Date(today.getFullYear(), monthIndex, day);
    if (date < today) date.setFullYear(date.getFullYear() + 1);
    date.setHours(0, 0, 0, 0);
    return { date, isNextWeek: false };
  }

  return { date: null, isNextWeek: false };
}

// Check absolute dates: DD/MM/YYYY, YYYY/MM/DD, etc.
function checkAbsoluteDates(
  text: string,
  today: Date,
): { date: Date | null; isNextWeek: boolean } {
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
      parsed.setHours(0, 0, 0, 0);
      return { date: parsed, isNextWeek: false };
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

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hourStr = match[1];
      const minuteStr = match[2] || "00";

      let hour = parseInt(hourStr, 10);
      if (isNaN(hour) && HOUR_WORDS[hourStr.toLowerCase()]) {
        hour = HOUR_WORDS[hourStr.toLowerCase()];
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
              matchHour = HOUR_WORDS[wordHour];
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

        if (isNaN(hour) && HOUR_WORDS[hourStr.toLowerCase()]) {
          hour = HOUR_WORDS[hourStr.toLowerCase()];
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
