interface ParsedBookingData {
  customerName: string;
  datetime: {
    start: { date: string; time: string };
    end: { date: string; time: string };
  };
  numberOfPeople: number;
}

export function parseBookingData(
  message: string,
  referenceDate: Date,
  averageDurationMinutes: number = 90,
): ParsedBookingData {
  const text = message.toLowerCase().trim();

  // 1. Extraer número de personas
  const people = extractPeople(text);

  // 2. Extraer fechas
  const dates = extractDates(text, referenceDate);

  // 3. Extraer tiempos (rango o individual)
  const times = extractTimes(text);

  // 4. Aplicar reglas de negocio
  const resolvedDateTime = resolveDateTime({
    dates,
    times,
    referenceDate,
    averageDurationMinutes,
  });

  // 5. Extraer nombre (preservar mayúsculas del original)
  const name = extractName(message);

  return {
    customerName: name,
    datetime: resolvedDateTime,
    numberOfPeople: people,
  };
}

function extractPeople(text: string): number {
  // "para 4 personas", "somos 3", "2 comensales"
  const match = text.match(
    /\b(?:para|somos|seremos|serán|comensales?)\s*(\d+)|\b(\d+)\s*(?:personas?|comensales?)\b/i,
  );
  if (match) return parseInt(match[1] || match[2]);

  // Mensajes ultra-cortos: "4", "para 2"
  if (/^\d+$/.test(text.trim()) && parseInt(text) <= 20) {
    return parseInt(text.trim());
  }

  return 0; // 0 = no proporcionado
}

function extractDates(text: string, ref: Date): { start?: Date; end?: Date } {
  const today = new Date(ref);
  today.setHours(0, 0, 0, 0);

  // Hoy, mañana, pasado mañana
  if (/hoy/i.test(text)) return { start: today };
  if (/mañana/i.test(text)) {
    const tmrw = new Date(today);
    tmrw.setDate(tmrw.getDate() + 1);
    return { start: tmrw };
  }
  if (/pasad[oa]\s*mañana/i.test(text)) {
    const dat = new Date(today);
    dat.setDate(dat.getDate() + 2);
    return { start: dat };
  }

  // Weekdays en español
  const weekdays = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];
  const dayMatch = text.match(
    /(domingo|lunes|martes|miércoles|jueves|viernes|sábado)/i,
  );
  if (dayMatch) {
    const targetDay = weekdays.indexOf(dayMatch[1].toLowerCase());
    const currentDay = ref.getDay();
    let daysToAdd = (targetDay - currentDay + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7; // próximo ocurrencia

    const next = new Date(today);
    next.setDate(today.getDate() + daysToAdd);
    return { start: next };
  }

  // Fin de semana → sábado
  if (/fin\s+de\s+semana/i.test(text)) {
    const sat = new Date(today);
    while (sat.getDay() !== 6) sat.setDate(sat.getDate() + 1);
    return { start: sat };
  }

  // Fechas absolutas: "25 de enero"
  const absMatch = text.match(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
  );
  if (absMatch) {
    const day = parseInt(absMatch[1]);
    const monthNames = [
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
    const month = monthNames.indexOf(absMatch[2].toLowerCase());
    const year = ref.getFullYear();

    let date = new Date(year, month, day);
    if (date < ref) date.setFullYear(year + 1); // Si ya pasó, usar próximo año

    return { start: date };
  }

  return {};
}

function extractTimes(text: string): {
  start?: string;
  end?: string;
  isRange: boolean;
} {
  // Rango horario: "de 8 a 10", "de 22:00 a 02:00"
  const rangeMatch = text.match(
    /(?:de|entre|desde)\s+(\d{1,2})(?::(\d{2}))?\s*(?:a|hasta|y)\s+(\d{1,2})(?::(\d{2}))?/i,
  );
  if (rangeMatch) {
    const h1 = rangeMatch[1].padStart(2, "0");
    const m1 = rangeMatch[2] || "00";
    const h2 = rangeMatch[3].padStart(2, "0");
    const m2 = rangeMatch[4] || "00";
    return {
      start: `${h1}:${m1}:00`,
      end: `${h2}:${m2}:00`,
      isRange: true,
    };
  }

  // Formato 12h: "a las 8pm", "para las 2pm"
  const pmMatch = text.match(
    /(?:a\s+las|para\s+las)\s+(\d{1,2})\s*(?:pm|p\.?m\.?)/i,
  );
  if (pmMatch) {
    let hour = parseInt(pmMatch[1]);
    if (hour < 12) hour += 12;
    return {
      start: `${hour.toString().padStart(2, "0")}:00:00`,
      end: undefined,
      isRange: false,
    };
  }

  // Formato 24h: "a las 20:00", "para las 14:30"
  const timeMatch = text.match(
    /(?:a\s+las|para\s+las)\s+(\d{1,2})(?::(\d{2}))?/i,
  );
  if (timeMatch) {
    const h = timeMatch[1].padStart(2, "0");
    const m = timeMatch[2] || "00";
    return {
      start: `${h}:${m}:00`,
      end: undefined,
      isRange: false,
    };
  }

  return { isRange: false };
}

function resolveDateTime({
  dates,
  times,
  referenceDate,
  averageDurationMinutes,
}: {
  dates: { start?: Date; end?: Date };
  times: { start?: string; end?: string; isRange: boolean };
  referenceDate: Date;
  averageDurationMinutes: number;
}): ParsedBookingData["datetime"] {
  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const formatTime = (d: Date) => d.toTimeString().slice(0, 8);

  // Caso 1: Rango horario explícito
  if (times.isRange && times.start && times.end) {
    const startDate = dates.start || referenceDate;
    const endDate = dates.end || startDate;

    // Manejar cruce de medianoche
    const startHour = parseInt(times.start.split(":")[0]);
    const endHour = parseInt(times.end.split(":")[0]);
    let finalEndDate = endDate;

    if (endHour < startHour) {
      finalEndDate = new Date(endDate);
      finalEndDate.setDate(finalEndDate.getDate() + 1);
    }

    return {
      start: { date: formatDate(startDate), time: times.start },
      end: { date: formatDate(finalEndDate), time: times.end },
    };
  }

  // Caso 2: Solo hora de inicio → calcular endTime
  if (times.start && !times.end) {
    const startDate = dates.start || referenceDate;

    const [h, m] = times.start.split(":").map(Number);
    const startDateTime = new Date(startDate);
    startDateTime.setHours(h, m, 0);

    const endDateTime = new Date(
      startDateTime.getTime() + averageDurationMinutes * 60000,
    );

    return {
      start: { date: formatDate(startDate), time: times.start },
      end: { date: formatDate(endDateTime), time: formatTime(endDateTime) },
    };
  }

  // Caso 3: Solo fecha → sin tiempos
  return {
    start: { date: dates.start ? formatDate(dates.start) : "", time: "" },
    end: { date: dates.end ? formatDate(dates.end) : "", time: "" },
  };
}

function extractName(message: string): string {
  // Detectar nombres con mayúsculas: "Raúl Lara", "Juan Pérez"
  const nameMatch = message.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (
    nameMatch &&
    !/^(Hola|Buenos|Buenas|Gracias|Adiós|Por favor|Sí|No|Vale|Ok|Claro|Perfecto)$/i.test(
      nameMatch[0],
    )
  ) {
    return nameMatch[0];
  }
  return "";
}
