import { GenerateTextResult, ToolSet } from "ai";
import { Day } from "@/types/business/cms-types";
import { WEEK_DAYS, WeekDay } from "@/ai-agents/agent.types";

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

type Schedule = {
  monday?: Day[] | null;
  tuesday?: Day[] | null;
  wednesday?: Day[] | null;
  thursday?: Day[] | null;
  friday?: Day[] | null;
  saturday?: Day[] | null;
  sunday?: Day[] | null;
};

export function isStartDateTimeWithinSchedule(
  startDateTimeUtc: string,
  schedule: Schedule,
  timezone: string,
): boolean {
  // Convertimos la fecha UTC a la zona horaria del negocio
  const date = new Date(startDateTimeUtc);
  const localDateStr = date.toLocaleString("en-US", { timeZone: timezone });
  const localDate = new Date(localDateStr);

  // Obtenemos el día de la semana en minúsculas
  const days: Record<number, keyof Schedule> = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };
  const dayKey = days[localDate.getDay()];
  const daySchedule = schedule[dayKey];

  if (!daySchedule || daySchedule.length === 0) return false;

  // Calculamos minutos desde medianoche
  const minutes = localDate.getHours() * 60 + localDate.getMinutes();

  // Verificamos si cae en algún rango
  for (const range of daySchedule) {
    if (minutes >= range.open && minutes < range.close) {
      return true;
    }
  }

  return false;
}

// ===== Ejemplo de uso =====
const scheduleExample: Schedule = {
  monday: [
    { open: 480, close: 720 },
    { open: 840, close: 1200 },
  ], // 08:00-12:00 y 14:00-20:00
  tuesday: [{ open: 480, close: 720 }],
};

console.log(
  isStartDateTimeWithinSchedule(
    "2025-12-29T18:00:00.000Z",
    scheduleExample,
    "America/Guayaquil",
  ),
); // true o false
