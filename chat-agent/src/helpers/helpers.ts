import { GenerateTextResult, ToolSet } from "ai";
import { WEEK_DAYS, WeekDay } from "@/types/reservation/reservation.types";

/**
 *
 * @description Parse input string to object
 * @param arg input schema from LLM that is passed to the ai-sdk for tool decision
 * @returns
 */
export const parseInput = (arg: string | Record<string, string>) => {
  if (typeof arg === "string") {
    try {
      // El modelo devuelve un string con comillas externas y JSON dentro.
      // Primero, quitamos las comillas exteriores.
      let str = arg.trim();
      if (str.startsWith('"') && str.endsWith('"')) {
        str = str.slice(1, -1);
      }
      // Parseamos el JSON interno
      return JSON.parse(str);
    } catch (error) {
      // Si falla, devolvemos el argumento original para que la validación falle
      console.error("Failed to parse input:", arg, error);
      return {};
    }
  }
  // Si no es string, lo devolvemos tal cual (debería ser objeto)
  return arg;
};

export function renderAssistantText<T>(result: T): string {
  return (result as GenerateTextResult<ToolSet, unknown>).steps
    .flatMap((step) => step.content ?? [])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

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

  const zonedDate = new Date(
    new Date(localISO).toLocaleString("en-US", { timeZone }),
  );

  return new Date(
    zonedDate.getTime() - zonedDate.getTimezoneOffset() * 60_000,
  ).toISOString();
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

  const formatter = new Intl.DateTimeFormat("en-CA", {
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
