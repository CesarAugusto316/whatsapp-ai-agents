/**
 * Utility functions for calculating expected dates based on semantic expressions
 */

/**
 * Gets the date for "hoy" (today)
 */
export function getToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Gets the date for "mañana" (tomorrow)
 */
export function getTomorrow(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Gets the date for "pasado mañana" (day after tomorrow)
 */
export function getDayAfterTomorrow(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Gets the date for the next occurrence of a specific weekday
 * @param dayName Day name in Spanish (lunes, martes, miércoles, jueves, viernes, sábado, domingo)
 */
export function getNextWeekday(dayName: string): Date {
  const date = new Date();
  const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const targetDayIndex = daysOfWeek.indexOf(dayName.toLowerCase());

  if (targetDayIndex === -1) {
    throw new Error(`Invalid day name: ${dayName}`);
  }

  const currentDayIndex = date.getDay(); // 0 = domingo, 1 = lunes, etc.
  let daysUntilTarget = (targetDayIndex - currentDayIndex + 7) % 7;

  // If today is the target day, go to next week's occurrence
  if (daysUntilTarget === 0) {
    daysUntilTarget = 7;
  }

  date.setDate(date.getDate() + daysUntilTarget);
  date.setHours(0, 0, 0, 0);

  return date;
}

/**
 * Gets the date for the next occurrence of a specific weekday with "próximo" modifier
 * @param dayName Day name in Spanish (lunes, martes, miércoles, jueves, viernes, sábado, domingo)
 */
export function getNextWeekWeekday(dayName: string): Date {
  const date = new Date();
  const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const targetDayIndex = daysOfWeek.indexOf(dayName.toLowerCase());

  if (targetDayIndex === -1) {
    throw new Error(`Invalid day name: ${dayName}`);
  }

  const currentDayIndex = date.getDay(); // 0 = domingo, 1 = lunes, etc.
  let daysUntilTarget = (targetDayIndex - currentDayIndex + 7) % 7;

  // If "próximo" is specified, ensure we go to the next week even if today is the target day
  if (daysUntilTarget === 0) {
    daysUntilTarget = 7; // If today is the target day, go to next week
  }

  date.setDate(date.getDate() + daysUntilTarget);
  date.setHours(0, 0, 0, 0);

  return date;
}

/**
 * Formats a date to UTC YYYY-MM-DD format
 */
export function formatDateUTC(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculates date for a specific day and month in the current or next year
 * @param day Day of the month (1-31)
 * @param month Month (0-11, where 0 = January)
 */
export function getDateForDayAndMonth(day: number, month: number): Date {
  const date = new Date();
  date.setMonth(month);
  date.setDate(day);
  date.setHours(0, 0, 0, 0);

  // If the date has already passed this year, set it to next year
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date;
}

/**
 * Calculates date for a specific day, month and year
 * @param day Day of the month (1-31)
 * @param month Month (0-11, where 0 = January)
 * @param year Year (e.g., 2024)
 */
export function getDateForDayMonthYear(day: number, month: number, year: number): Date {
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
}
