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

// Helper: obtiene el próximo día específico de la semana
export function getNextSpecificDayInTimezone(
  dayIndex: number,
  timezone: string,
): string {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  const currentDay = zoned.getDay();
  let daysUntilTarget = (dayIndex - currentDay + 7) % 7;
  if (daysUntilTarget === 0) daysUntilTarget = 7; // If today is the target day, go to next week's occurrence
  zoned.setDate(zoned.getDate() + daysUntilTarget);
  zoned.setHours(0, 0, 0, 0);
  return fromZonedTime(zoned, timezone).toISOString().split("T")[0];
}

// Helper: obtiene el día específico de la próxima semana
export function getNextWeekSpecificDayInTimezone(
  dayIndex: number,
  timezone: string,
): string {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  const currentDay = zoned.getDay();
  let daysUntilTarget = (dayIndex - currentDay + 7) % 7;
  if (daysUntilTarget === 0) daysUntilTarget = 7; // If today is the target day, go to next week
  daysUntilTarget += 7; // Add another 7 days to get to the following week
  zoned.setDate(zoned.getDate() + daysUntilTarget);
  zoned.setHours(0, 0, 0, 0);
  return fromZonedTime(zoned, timezone).toISOString().split("T")[0];
}

// Helper: obtiene el día específico del mes próximo
export function getNextMonthSpecificDayInTimezone(
  dayIndex: number,
  timezone: string,
): Date {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  const nextMonth = new Date(zoned.getFullYear(), zoned.getMonth() + 1, 1);

  // Find the first occurrence of the target day in the next month
  let candidateDate = new Date(nextMonth);
  candidateDate.setDate(1);

  // Find the first occurrence of the target day of the week
  while (candidateDate.getDay() !== dayIndex) {
    candidateDate.setDate(candidateDate.getDate() + 1);
  }

  // If the found date is before the current date, get the next occurrence
  if (candidateDate < zoned) {
    // Add 7 days to get the next occurrence
    candidateDate.setDate(candidateDate.getDate() + 7);
  }

  return candidateDate;
}
