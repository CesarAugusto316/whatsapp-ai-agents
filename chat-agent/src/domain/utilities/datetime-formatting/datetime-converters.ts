import { WEEK_DAYS, WeekDay } from "@/infraestructure/http/cms";

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 *
 * @example
 * TIMEZONE: America/Guayaquil
 *
 * DAY: MONDAY
 * STATUS: OPEN
 * RANGE: 08:00-12:00
 * RANGE: 14:00-20:00
 *
 * DAY: TUESDAY
 * STATUS: CLOSED
 *
 * DAY: WEDNESDAY
 * STATUS: OPEN
 * RANGE: 12:00-15:00
 * RANGE: 18:00-22:00
 *
 * DAY: THURSDAY
 * STATUS: OPEN
 * RANGE: 08:00-12:00
 *
 * DAY: FRIDAY
 * STATUS: OPEN
 * RANGE: 09:00-
 *
 * @param schedule
 * @param timezone
 * @returns
 */
export function formatSchedule(schedule: WeekDay, timezone: string): string {
  const lines: string[] = [];
  lines.push(`TIMEZONE: ${timezone}`);

  for (const day of WEEK_DAYS) {
    const slots = schedule?.[day];

    lines.push(``);
    lines.push(`DAY: ${day.toUpperCase()}`);

    if (!slots || slots.length === 0) {
      lines.push(`STATUS: CLOSED`);
      continue;
    }

    lines.push(`STATUS: OPEN`);

    for (const slot of slots) {
      const start = formatMinutes(slot.open); // ya no necesitas iso ni Date
      const end = formatMinutes(slot.close);
      lines.push(`RANGE: ${start}-${end}`);
    }
  }
  return lines.join("\n");
}

/**
 *
 * @example
 *  localDateTimeToUTC(
 *   "2026-01-02",
 *   "20:00:00",
 *   "America/Guayaquil"
 * );
 * // → "2026-01-03T01:00:00.000Z"
 * @param date
 * @param time
 * @param timeZone
 * @returns
 */
export function localDateTimeToUTC(
  dateTime: { date: string; time: string },
  timeZone: string,
): string {
  const { date, time } = dateTime;
  const localISO = `${date}T${time}`;

  // Crear la fecha en la zona horaria local
  const localDate = new Date(localISO);

  // Obtener el offset en minutos para esta fecha en la zona horaria especificada
  const offsetMs =
    new Date(localDate.toLocaleString("en-US", { timeZone })).getTime() -
    new Date(localDate.toLocaleString("en-US", { timeZone: "UTC" })).getTime();

  // Ajustar al UTC
  const utcDate = new Date(localDate.getTime() - offsetMs);

  return utcDate.toISOString();
}

/**
 *
 * @example
 *  utcToLocalDateTime(
 *   "2026-01-03T01:00:00.000Z",
 *   "America/Guayaquil"
 * );
 * // → { date: "2026-01-02", time: "20:00:00" }
 * @param utcISO
 * @param timeZone
 * @returns
 */
export function utcToLocalDateTime(
  utcISO: string,
  timeZone: string,
): { date: string; time: string } {
  const date = new Date(utcISO);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}:${map.second}`,
  };
}

/**
 *
 * @todo use luxon: https://moment.github.io/luxon/#/zones
 * @param dateTime
 * @param timeZone
 * @returns
 */
export function formatLocalDateTime(
  dateTime: { date: string; time: string },
  timeZone: string,
): string {
  // Convertir la fecha/hora local (en la zona horaria dada) a UTC
  const utcISO = localDateTimeToUTC(dateTime, timeZone);
  const date = new Date(utcISO);

  // Formatear la fecha en la zona horaria dada
  const dateFormatter = new Intl.DateTimeFormat("es-ES", {
    timeZone: timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Formatear la hora en la zona horaria dada
  const timeFormatter = new Intl.DateTimeFormat("es-ES", {
    timeZone: timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateParts = dateFormatter.formatToParts(date);
  const timeParts = timeFormatter.formatToParts(date);

  // Extraer valores de las partes de fecha
  const getPartValue = (type: string) =>
    dateParts.find((part) => part.type === type)?.value || "";

  const weekday = getPartValue("weekday");
  const day = getPartValue("day");
  const month = getPartValue("month");
  const year = getPartValue("year");

  // Extraer valores de las partes de hora
  const hour = timeParts.find((part) => part.type === "hour")?.value || "";
  const minute = timeParts.find((part) => part.type === "minute")?.value || "";
  const dayPeriod =
    timeParts.find((part) => part.type === "dayPeriod")?.value || "";

  // Capitalizar primera letra
  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  // Formatear hora: convertir "a. m."/ "p. m." a "am"/"pm"
  const formattedDayPeriod = dayPeriod
    .replace("a. m.", "am")
    .replace("p. m.", "pm")
    .replace("a.m.", "am")
    .replace("p.m.", "pm")
    .trim();

  return `${capitalize(weekday)} ${day} de ${month} del ${year}, ${hour}:${minute}${formattedDayPeriod}`;
}

/**
 *
 * @todo use luxon: https://moment.github.io/luxon/#/zones
 * @param dateTime
 * @param timeZone
 * @returns
 */
export function formatLocalDateTimeDST(
  dateTime: { date: string; time: string },
  timeZone: string,
): string {
  // 1. Crear fecha directamente sin conversiones complicadas
  const localDateStr = `${dateTime.date}T${dateTime.time}`;
  const date = new Date(localDateStr);

  // 2. Verificar si la fecha es válida
  if (isNaN(date.getTime())) {
    throw new Error(`Fecha inválida: ${dateTime.date} ${dateTime.time}`);
  }

  // 3. Formateador de fecha CON zona horaria (para día correcto)
  const dateFormatter = new Intl.DateTimeFormat("es-ES", {
    timeZone: timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 4. Formateador de hora SIN zona horaria (mantiene la hora local)
  const timeFormatter = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateParts = dateFormatter.formatToParts(date);
  const timeParts = timeFormatter.formatToParts(date);

  // Extraer partes
  const getPartValue = (type: string, parts: any[]) =>
    parts.find((part) => part.type === type)?.value || "";

  const weekday = getPartValue("weekday", dateParts);
  const day = getPartValue("day", dateParts);
  const month = getPartValue("month", dateParts);
  const year = getPartValue("year", dateParts);

  const hour = getPartValue("hour", timeParts);
  const minute = getPartValue("minute", timeParts);
  const dayPeriod = getPartValue("dayPeriod", timeParts);

  // Formatear AM/PM
  const ampm = dayPeriod.includes("p.") ? "pm" : "am";

  // Capitalizar día
  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return `${capitalize(weekday)} ${day} de ${month} del ${year}, ${hour}:${minute}${ampm}`;
}
