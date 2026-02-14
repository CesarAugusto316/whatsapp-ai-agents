import { toZonedTime, fromZonedTime } from "date-fns-tz";

// Helper: obtiene "hoy" en una zona horaria específica (a las 00:00:00 local)
export function getTodayInTimezone(timezone: string): string {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  zoned.setHours(0, 0, 0, 0);
  return fromZonedTime(zoned, timezone).toISOString().split("T")[0];
}

// Helper: obtiene "mañana" en una zona horaria
export function getTomorrowInTimezone(timezone: string): string {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  zoned.setDate(zoned.getDate() + 1);
  zoned.setHours(0, 0, 0, 0);
  return fromZonedTime(zoned, timezone).toISOString().split("T")[0];
}

// Helper: obtiene "ayer" en una zona horaria
export function getYesterdayInTimezone(timezone: string): string {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  zoned.setDate(zoned.getDate() - 1);
  zoned.setHours(0, 0, 0, 0);
  return fromZonedTime(zoned, timezone).toISOString().split("T")[0];
}

// Helper: obtiene una fecha específica en una zona horaria
export function getDateInTimezone(date: Date, timezone: string): string {
  const zoned = toZonedTime(date, timezone);
  return fromZonedTime(zoned, timezone).toISOString().split("T")[0];
}

// Helper: obtiene una fecha futura relativa
export function getRelativeDateInTimezone(
  offset: number,
  timezone: string,
): string {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  zoned.setDate(zoned.getDate() + offset);
  zoned.setHours(0, 0, 0, 0);
  return fromZonedTime(zoned, timezone).toISOString().split("T")[0];
}

// Helper: obtiene "pasado mañana"
export function getDayAfterTomorrowInTimezone(timezone: string): string {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  zoned.setDate(zoned.getDate() + 2);
  zoned.setHours(0, 0, 0, 0);
  return fromZonedTime(zoned, timezone).toISOString().split("T")[0];
}
