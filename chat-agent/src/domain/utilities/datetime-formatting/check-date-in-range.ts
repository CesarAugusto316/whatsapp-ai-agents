/**
 * Verifica si una fecha está dentro de un rango de fechas (inclusive)
 * @param range - Objeto con las fechas de inicio y fin del rango
 * @param dateToCheck - Fecha a verificar en formato UTC ISO string
 * @returns true si la fecha está dentro del rango, false en caso contrario
 */
export function checkUtcDateInRange(
  range: { startDate: string; endDate: string },
  dateToCheck: string,
): boolean {
  // Convertir strings a timestamps para comparación numérica
  const startTime = new Date(range.startDate).getTime();
  const endTime = new Date(range.endDate).getTime();
  const checkTime = new Date(dateToCheck).getTime();

  // Validar que las fechas sean válidas
  if (isNaN(startTime) || isNaN(endTime) || isNaN(checkTime)) {
    throw new Error("Formato de fecha inválido");
  }

  // Verificar si la fecha está dentro del rango (inclusive)
  return checkTime >= startTime && checkTime <= endTime;
}
