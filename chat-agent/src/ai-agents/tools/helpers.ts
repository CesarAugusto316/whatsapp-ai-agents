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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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

export function formatSchedule(schedule: WeekDay, timezone: string): string {
  return WEEK_DAYS.map((day) => {
    const slots = schedule[day];

    if (!slots || slots?.length === 0) {
      return `- ${capitalize(day)}: Closed`;
    }
    const ranges = slots
      .map((slot) => {
        const start = formatTime(slot.startTime, timezone);
        const end = formatTime(slot.endTime, timezone);
        return `${start} to ${end}`;
      })
      .join("\n  ");

    return `- ${capitalize(day)}:\n  ${ranges}`;
  }).join("\n");
}
