import { WeekDay } from "@/types/reservation/reservation.types";

/**
 * Verifica si una fecha/hora específica cae dentro del horario de atención del restaurante
 *
 * @param schedule - Horario del restaurante
 * @param timezone - Timezone del restaurante (ej: "America/Guayaquil")
 * @param dateTime - Objeto con fecha y hora a verificar (ASUMIENDO que ya está en el timezone del restaurante)
 * @returns boolean - true si está dentro del horario, false si no
 */
/**
 * Verifica si una fecha/hora específica cae dentro del horario de atención del restaurante
 *
 * @param schedule - Horario del restaurante
 * @param timezone - Timezone del restaurante (ej: "America/Guayaquil") - USADO SOLO PARA EL DÍA
 * @param dateTime - Objeto con fecha y hora a verificar (ASUMIENDO que ya está en hora local del restaurante)
 * @returns boolean - true si está dentro del horario, false si no
 */
export function isWithinBusinessHours(
  schedule: WeekDay,
  timezone: string,
  dateTime: { date: string; time: string },
): boolean {
  try {
    // 1. Crear fecha con la hora local del restaurante
    const dateStr = `${dateTime.date}T${dateTime.time}`;
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      throw new Error(`Fecha inválida: ${dateTime.date} ${dateTime.time}`);
    }

    // 2. Obtener el día de la semana EN EL TIMEZONE DEL RESTAURANTE
    // Esto es importante para casos cerca de medianoche
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
    });

    const weekday = dayFormatter.format(date).toLowerCase() as keyof WeekDay;

    // 3. Convertir la hora ORIGINAL a minutos (NO convertir timezone, ya está en hora del restaurante)
    // Solo validamos el formato, pero no cambiamos la hora
    const timeParts = dateTime.time.split(":").map(Number);
    if (timeParts.length < 2 || timeParts.some(isNaN)) {
      throw new Error(`Hora inválida: ${dateTime.time}`);
    }

    const [hours, minutes] = timeParts;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Hora fuera de rango: ${dateTime.time}`);
    }

    const currentMinutes = hours * 60 + minutes;

    // 4. Verificar si el restaurante está abierto ese día
    const daySchedule = schedule[weekday];
    if (!daySchedule || daySchedule.length === 0) {
      return false;
    }

    // 5. Verificar si está dentro de algún bloque
    return daySchedule.some((slot) => {
      const closeTime = slot.close !== undefined ? slot.close : 24 * 60;
      return currentMinutes >= slot.open && currentMinutes <= closeTime;
    });
  } catch (error) {
    console.error("Error en isWithinBusinessHours:", error);
    return false;
  }
}
