import { WEEK_DAYS, WeekDay } from "@/types/reservation/reservation.types";

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
  console.log({ lines });
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
