import { GenerateTextResult, ToolSet } from "ai";
import { WEEK_DAYS, WeekDay } from "../agent.types";

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

function formatTime(isoString: string, timezone: string): string {
  const date = new Date(isoString);

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
}

/**
 *
 * @example
 * TIMEZONE: America/Guayaquil
 * DAY: MONDAY
 * STATUS: OPEN
 * RANGE: 18:00-23:00
 *
 * DAY: TUESDAY
 * STATUS: CLOSED
 *
 * DAY: WEDNESDAY
 * STATUS: OPEN
 * RANGE: 12:00-15:00
 * RANGE: 18:00-22:00
 * @param schedule
 * @param timezone
 * @returns
 */
export function formatSchedule(schedule: WeekDay, timezone: string): string {
  const lines: string[] = [];
  lines.push(`TIMEZONE: ${timezone}`);

  for (const day of WEEK_DAYS) {
    const slots = schedule?.[day];

    console.log(slots);
    lines.push(``);
    lines.push(`DAY: ${day.toUpperCase()}`);

    if (!slots || slots.length === 0) {
      lines.push(`STATUS: CLOSED`);
      continue;
    }

    lines.push(`STATUS: OPEN`);

    for (const slot of slots) {
      const start = formatTime(slot.startTime, timezone);
      const end = formatTime(slot.endTime, timezone);
      lines.push(`RANGE: ${start}-${end}`);
    }
  }
  console.log({ lines });
  return lines.join("\n");
}
