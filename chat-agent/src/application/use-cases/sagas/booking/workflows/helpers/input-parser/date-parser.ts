import { z } from "zod";

// Definición del esquema de respuesta
const BookingDataSchema = z.object({
  customerName: z.string(),
  datetime: z.object({
    start: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // formato YYYY-MM-DD
      time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/), // formato HH:MM:SS
    }),
    end: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // formato YYYY-MM-DD
      time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/), // formato HH:MM:SS
    }),
  }),
  numberOfPeople: z.number().int().min(0).max(50),
});

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
  timezone: string = "America/Mexico_City", // Zona horaria por defecto para Latinoamérica
  referenceDate: Date = new Date(),
): ParsedBookingData {
  // Normalizar el mensaje
  const normalizedMessage = message.trim();

  // Extraer número de personas
  const numberOfPeople = extractNumberOfPeople(normalizedMessage);

  // Extraer nombre del cliente
  const customerName = extractCustomerName(message); // Usar el mensaje original para preservar mayúsculas

  // Extraer fechas y tiempos
  const { startDate, startTime, endDate, endTime } = extractDateTime(
    normalizedMessage,
    timezone,
    referenceDate,
  );

  // Validar y formatear la respuesta
  const result = BookingDataSchema.parse({
    customerName,
    datetime: {
      start: {
        date: startDate,
        time: startTime,
      },
      end: {
        date: endDate,
        time: endTime,
      },
    },
    numberOfPeople,
  });

  return result;
}

/**
 * Extrae el número de personas del mensaje
 */
function extractNumberOfPeople(message: string): number {
  const text = message.toLowerCase();

  // Patrones comunes para identificar número de personas
  const patterns = [
    // "mesa para X", "para X personas", etc.
    /(?:mesa|reserva|cita|evento)\s+para\s+(\d+)/i,
    // "para X personas", "X personas", "mesa para X"
    /(?:para|de|con|grupo de|somos|vamos a ser|vamos|total|reserva para)\s*(\d+)\s*(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i,

    // "X adultos", "X niños", etc.
    /(\d+)\s*(?:adultos?|niños?|menores?|bebes?|bebés?)/i,

    // Números simples al principio o al final
    /^(\d+)\s*(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i,
    /(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)\s*(\d+)$/i,

    // "somos X", "serán X", etc.
    /(?:somos|serán|vamos a ser|vamos|va a ir|van a ir|irá|irán)\s*(\d+)/i,

    // Expresiones regionales: "pa' X", "pa X", etc.
    /(?:pa'|pa)\s*(\d+)\s*(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i,

    // Expresiones regionales inversas: "X pa'", "X pa"
    /(\d+)\s*(?:pa'|pa)\s*/i,

    // Expresiones regionales específicas
    /(\d+)\s+(?:chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?|compis?|hermano)/i,

    // Expresiones regionales con palabras intermedias (por ejemplo: "Vamos pa' 2 el sábado parce")
    /(?:vamos|somos|va a ir|van a ir)\s+p[ao]'?\s*(\d+)(?:\s+el\s+\w+\s+parce|\s+\w+\s+el\s+\w+\s+parce|\s+\w+\s+parce|\s+\w+\s+hermano|\s+\w+\s+pana)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0 && num <= 50) {
        // Rango razonable
        return num;
      }
    }
  }

  // Si no encontramos un número explícito con los patrones anteriores,
  // intentemos un enfoque más general para detectar números en contexto regional
  // Buscar números que estén cerca de términos regionales
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
    const regionalPattern = new RegExp(
      `(\\d+)\\s+${term}|${term}\\s+(\\d+)`,
      "i",
    );
    const regionalMatch = text.match(regionalPattern);
    if (regionalMatch) {
      const num = parseInt(regionalMatch[1] || regionalMatch[2], 10);
      if (!isNaN(num) && num > 0 && num <= 50) {
        return num;
      }
    }
  }

  // Buscar también patrones como "vamos pa' X" o "somos X"
  const vamosPattern = /(?:vamos|somos|va a ir|van a ir)\s+pa'?s*\s*(\d+)/i;
  const vamosMatch = text.match(vamosPattern);
  if (vamosMatch && vamosMatch[1]) {
    const num = parseInt(vamosMatch[1], 10);
    if (!isNaN(num) && num > 0 && num <= 50) {
      return num;
    }
  }

  // Buscar también patrones más generales como "grupo de X personas", "equipo de X", etc.
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

  for (const pattern of generalPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0 && num <= 50) {
        return num;
      }
    }
  }

  // Si no encontramos un número explícito, buscar algunos casos comunes
  if (text.includes("solo") || text.includes("solos")) {
    if (text.includes("dos") || text.includes("2")) return 2;
    if (text.includes("uno") || text.includes("1")) return 1;
  }

  // Valor por defecto si no se encuentra número
  return 0;
}

/**
 * Extrae el nombre del cliente del mensaje
 */
function extractCustomerName(message: string): string {
  // Buscar posibles nombres propios (palabras que comienzan con mayúscula)
  // Incluye caracteres acentuados y ñ
  const namePattern =
    /[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,}(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,})*/g;
  const matches = message.match(namePattern) || [];

  // Filtrar palabras comunes que no son nombres
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

  const potentialNames = matches.filter((name) => !commonWords.includes(name));

  // Devolver el primer nombre potencial encontrado o cadena vacía
  return potentialNames.length > 0 ? potentialNames[0] : "";
}

/**
 * Extrae fecha y hora del mensaje
 */
function extractDateTime(
  message: string,
  timezone: string,
  referenceDate: Date,
): {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
} {
  const text = message.toLowerCase();

  // Determinar la fecha
  const { date, isNextWeek } = extractDate(text, referenceDate);

  // Determinar la hora de inicio
  const startTime = extractStartTime(text);

  // Determinar la hora de fin (basada en duración promedio o explícita)
  const endTime = extractEndTime(text, startTime);

  // Formatear fechas en UTC
  const startDate = formatDateUTC(date);
  const endDate = startTime > endTime ? addDays(date, 1) : date; // Si la hora final es menor, es cruza medianoche

  return {
    startDate,
    startTime,
    endDate: formatDateUTC(endDate),
    endTime,
  };
}

/**
 * Extrae la fecha del mensaje
 */
function extractDate(
  text: string,
  referenceDate: Date,
): { date: Date; isNextWeek: boolean } {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  // Fechas relativas
  if (text.includes("hoy")) {
    return { date: today, isNextWeek: false };
  }

  if (text.includes("mañana")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { date: tomorrow, isNextWeek: false };
  }

  if (text.includes("pasado mañana")) {
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    return { date: dayAfterTomorrow, isNextWeek: false };
  }

  // Días de la semana (para fechas relativas como "el viernes")
  const daysOfWeek = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];
  for (let i = 0; i < daysOfWeek.length; i++) {
    if (text.includes(daysOfWeek[i])) {
      const targetDay = i;
      const currentDay = referenceDate.getDay(); // 0 = domingo, 1 = lunes, etc.

      let daysUntilTarget = (targetDay - currentDay + 7) % 7;
      if (daysUntilTarget === 0) daysUntilTarget = 7; // Si es el mismo día, ir al siguiente

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntilTarget);

      return { date: targetDate, isNextWeek: daysUntilTarget > 7 };
    }
  }

  // Fechas específicas (DD/MM/YYYY, DD-MM-YYYY, etc.)
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, // DD/MM/YYYY o DD-MM-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY-MM-DD o YYYY/MM/DD
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/, // DD/MM/YY o DD-MM-YY
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let [, first, second, year] = match;
      let day, month;
      let fullYear = parseInt(year, 10);

      // Convertir años de 2 dígitos a 4 dígitos
      if (fullYear < 100) {
        fullYear = fullYear + 2000;
      }

      // Determinar si es DD/MM/YYYY o MM/DD/YYYY basado en el contexto
      // En países hispanohablantes es más común DD/MM/YYYY
      // Si el primer número es > 12, entonces es DD/MM
      if (parseInt(first, 10) > 12) {
        day = parseInt(first, 10);
        month = parseInt(second, 10);
      } else if (parseInt(second, 10) > 12) {
        // Si el segundo número es > 12, entonces es DD/MM
        day = parseInt(second, 10);
        month = parseInt(first, 10);
      } else {
        // Si ambos son <= 12, asumimos DD/MM/YYYY para mantener coherencia con formato hispano
        day = parseInt(first, 10);
        month = parseInt(second, 10);
      }

      const parsedDate = new Date(fullYear, month - 1, day);

      // Si la fecha ya pasó, asumir que es del próximo año
      if (parsedDate < today) {
        parsedDate.setFullYear(parsedDate.getFullYear() + 1);
      }

      return { date: parsedDate, isNextWeek: false };
    }
  }

  // Mes y día (sin año)
  const monthDayPattern =
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
  const monthDayMatch = text.match(monthDayPattern);
  if (monthDayMatch) {
    const [, dayStr, monthStr] = monthDayMatch;
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
    const monthIndex = months.findIndex(
      (m) => m.toLowerCase() === monthStr.toLowerCase(),
    );
    const day = parseInt(dayStr, 10);

    const parsedDate = new Date(today.getFullYear(), monthIndex, day);

    // Si la fecha ya pasó este año, usar el próximo año
    if (parsedDate < today) {
      parsedDate.setFullYear(parsedDate.getFullYear() + 1);
    }

    return { date: parsedDate, isNextWeek: false };
  }

  // También buscar "viernes 12 de abril", "viernes 20 de septiembre" u otros formatos similares
  // Permitir palabras intermedias como "el", "del", etc.
  const weekdayMonthDayPattern =
    /(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\s*(?:el\s*)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
  const weekdayMonthDayMatch = text.match(weekdayMonthDayPattern);
  if (weekdayMonthDayMatch) {
    const [, , dayStr, monthStr] = weekdayMonthDayMatch;
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
    const monthIndex = months.findIndex(
      (m) => m.toLowerCase() === monthStr.toLowerCase(),
    );
    const day = parseInt(dayStr, 10);

    const parsedDate = new Date(today.getFullYear(), monthIndex, day);

    // Si la fecha ya pasó este año, usar el próximo año
    if (parsedDate < today) {
      parsedDate.setFullYear(parsedDate.getFullYear() + 1);
    }

    return { date: parsedDate, isNextWeek: false };
  }

  // Buscar también patrones como "12 de abril", "20 de julio", etc. sin día de la semana
  const dayMonthPattern =
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
  const dayMonthMatch = text.match(dayMonthPattern);
  if (dayMonthMatch) {
    const [, dayStr, monthStr] = dayMonthMatch;
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
    const monthIndex = months.findIndex(
      (m) => m.toLowerCase() === monthStr.toLowerCase(),
    );
    const day = parseInt(dayStr, 10);

    const parsedDate = new Date(today.getFullYear(), monthIndex, day);

    // Si la fecha ya pasó este año, usar el próximo año
    if (parsedDate < today) {
      parsedDate.setFullYear(parsedDate.getFullYear() + 1);
    }

    return { date: parsedDate, isNextWeek: false };
  }

  // Si no se encuentra ninguna fecha específica, usar hoy por defecto
  return { date: today, isNextWeek: false };
}

/**
 * Extrae la hora de inicio del mensaje
 */
function extractStartTime(text: string): string {
  // Patrones para horas (formato 24h o 12h con AM/PM)
  const timePatterns = [
    // HH:MM AM/PM o HH:MM PM/AM
    /(?:a\s+las?|desde|inicio|comienza|empieza|reunión|cita|reserva|entrada)\s+(\d{1,2}):(\d{2})\s*(?:a\.?m\.?|p\.?m\.?)/i,
    /(?:a\s+las?|desde|inicio|comienza|empieza|reunión|cita|reserva|entrada)\s+(\d{1,2})\s*(?:a\.?m\.?|p\.?m\.?)/i,

    // HH:MM AM/PM o HH:MM PM/AM (standalone)
    /(\d{1,2}):(\d{2})\s*(?:a\.?m\.?|p\.?m\.?)/i,
    /(\d{1,2})\s*(?:a\.?m\.?|p\.?m\.?)/i,

    // HH:MM (formato 24h)
    /(?:a\s+las?|desde|inicio|comienza|empieza|reunión|cita|reserva|entrada)\s+(\d{1,2}):(\d{2})/i,
    /(?:a\s+las?|desde|inicio|comienza|empieza|reunión|cita|reserva|entrada)\s+(\d{1,2})\s*(?:hrs?|horas?)/i,

    // HH:MM (formato 24h standalone)
    /(\d{1,2}):(\d{2})/i,

    // "a las ocho", "a las nueve treinta", etc. (horas en palabras)
    /(?:a\s+las?|desde|inicio|comienza|empieza)\s+(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)(?:\s+(?:treinta|media))?/i,

    // Horas en palabras standalone
    /(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)(?:\s+(?:treinta|media))?\s*(?:a\.?m\.?|p\.?m\.?)/i,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hourStr = match[1];
      const minuteStr = match[2] || "00";

      // Convertir horas en palabras a números si es necesario
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

      let hour = parseInt(hourStr, 10);
      if (isNaN(hour) && hourWords[hourStr.toLowerCase()]) {
        hour = hourWords[hourStr.toLowerCase()];
      }

      // Verificar si es AM o PM
      // Buscar AM/PM en el texto cerca de la hora encontrada
      const allAmpmMatches = text.match(
        /(\d{1,2}(?::\d{2})?|\b(?:una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b)\s*(a\.?m\.?|p\.?m\.?)/gi,
      );
      if (allAmpmMatches) {
        // Verificar si la hora actual coincide con alguna hora en el texto que tiene AM/PM
        for (const matchText of allAmpmMatches) {
          const hourPart = matchText.match(
            /(\d{1,2}(?::\d{2})?|\b(?:una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b)/i,
          );
          if (hourPart) {
            let matchHour = parseInt(hourPart[1], 10);
            if (isNaN(matchHour)) {
              // Si es una hora en palabras, convertirla
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

  // Si no se encuentra hora específica, usar hora por defecto (por ejemplo, 19:00)
  return "19:00:00";
}

/**
 * Extrae la hora de fin del mensaje
 */
function extractEndTime(text: string, startTime: string): string {
  // Patrones para hora de fin
  const endPatterns = [
    // "de X a Y", "de X hasta Y", "de X a las Y"
    /(?:de\s+\d+(?::\d+)?\s*(?:a\.?m\.?|p\.?m\.?)?\s+)?(?:a|a\s+las?|hasta|termina|finaliza)\s+(\d{1,2}):(\d{2})\s*(?:a\.?m\.?|p\.?m\.?)?/i,
    /(?:de\s+\d+(?::\d+)?\s*(?:a\.?m\.?|p\.?m\.?)?\s+)?(?:a|a\s+las?|hasta|termina|finaliza)\s+(\d{1,2})\s*(?:a\.?m\.?|p\.?m\.?)?/i,
    // "entre la X y las Y", "entre X y Y"
    /(?:entre\s+la\s+)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?\s+y\s+las?\s+(\d{1,2}):(\d{2})\s*(?:a\.?m\.?|p\.?m\.?)?/i,
    /(?:entre\s+la\s+)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?\s+y\s+las?\s+(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)?/i,
  ];

  for (const pattern of endPatterns) {
    const match = text.match(pattern);
    if (match) {
      let hourStr = match[1];
      const minuteStr = match[2] || "00";

      let hour = parseInt(hourStr, 10);

      // Verificar si es AM o PM
      // Primero intentar encontrar AM/PM asociado directamente con esta hora específica
      let ampm = null;
      if (match[3]) {
        // Si hay un tercer grupo de captura que podría ser AM/PM
        ampm = match[3]?.toLowerCase();
      }

      // Si no se encontró AM/PM en el match, buscar en el texto general
      if (!ampm) {
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
                // Si es una hora en palabras, convertirla
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
                const wordHour = hourPart[1].toLowerCase().trim();
                matchHour = hourWords[wordHour];
              }

              if (matchHour === hour) {
                ampm = matchText
                  .match(/(a\.?m\.?|p\.?m\.?)/i)?.[1]
                  ?.toLowerCase();
                break;
              }
            }
          }
        }
      }

      if (ampm?.includes("p") && hour < 12) {
        hour += 12;
      } else if (ampm?.includes("a") && hour === 12) {
        hour = 0;
      }

      return `${hour.toString().padStart(2, "0")}:${minuteStr.padStart(2, "0")}:00`;
    }
  }

  // Si no se encuentra hora de fin específica, calcularla basada en la hora de inicio
  // Suponiendo una duración promedio de 2 horas
  const [startHour, startMinute] = startTime.split(":").map(Number);
  let endHour = startHour;
  let endMinute = startMinute + 120; // Duración promedio de 2 horas

  // Ajustar minutos y horas si es necesario
  if (endMinute >= 60) {
    endHour += Math.floor(endMinute / 60);
    endMinute = endMinute % 60;

    if (endHour >= 24) {
      endHour = endHour % 24;
    }
  }

  return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;
}

/**
 * Formatea una fecha en formato UTC (YYYY-MM-DD)
 */
function formatDateUTC(date: Date): string {
  // Convertir a UTC asegurando que sea la fecha completa
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

/**
 * Agrega días a una fecha
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
