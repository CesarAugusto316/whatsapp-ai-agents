import { WEEK_DAYS, WeekDay } from "@/infraestructure/adapters/cms";

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
