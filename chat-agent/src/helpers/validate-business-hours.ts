import { Day } from "@/types/business/cms-types";

export type WeeklySchedule = {
  monday?: Day[];
  tuesday?: Day[];
  wednesday?: Day[];
  thursday?: Day[];
  friday?: Day[];
  saturday?: Day[];
  sunday?: Day[];
};

export type DateTimeRange = {
  start: { date: string; time: string }; // "2024-12-01", "20:00:00"
  end: { date: string; time: string };
};

// ===== FUNCIONES AUXILIARES =====

/**
 * Convierte tiempo "HH:MM:SS" a minutos desde medianoche
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Obtiene el nombre del día en inglés a partir de una fecha YYYY-MM-DD
 */
export const getDayName = (dateStr: string): keyof WeeklySchedule => {
  const date = new Date(dateStr + "T00:00:00");
  const dayIndex = date.getDay();

  const days: (keyof WeeklySchedule)[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return days[dayIndex];
};

/**
 * Verifica si un horario (en minutos) está dentro de algún intervalo del día
 */
const isTimeInSchedule = (
  minutes: number,
  daySchedule: Day[] | undefined,
): boolean => {
  if (!daySchedule || daySchedule.length === 0) {
    return false; // Día cerrado
  }

  return daySchedule.some(
    (interval) => minutes >= interval.open && minutes <= interval.close,
  );
};

// ===== FUNCIÓN PRINCIPAL =====

export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
  details?: {
    startDay?: keyof WeeklySchedule;
    startTimeMinutes?: number;
    endDay?: keyof WeeklySchedule;
    endTimeMinutes?: number;
  };
}

/**
 *
 * Valida que un rango de fecha/hora esté dentro del horario laboral
 */
export const validateBusinessHours = (
  datetimeRange: DateTimeRange,
  schedule: WeeklySchedule,
  timezone?: string, // Por si necesitas considerar timezone en el futuro
): ScheduleValidationResult => {
  const errors: string[] = [];
  const details = {};

  try {
    // 1. Obtener días de la semana
    const startDay = getDayName(datetimeRange.start.date);
    const endDay = getDayName(datetimeRange.end.date);

    // 2. Convertir horas a minutos
    const startMinutes = timeToMinutes(datetimeRange.start.time);
    const endMinutes = timeToMinutes(datetimeRange.end.time);

    // 3. Validar hora de inicio
    const startSchedule = schedule[startDay];
    if (!isTimeInSchedule(startMinutes, startSchedule)) {
      errors.push(
        `El horario de inicio (${datetimeRange.start.time}) no está dentro del horario de atención del ${startDay}`,
      );
    }

    // 4. Validar hora de fin
    const endSchedule = schedule[endDay];
    if (!isTimeInSchedule(endMinutes, endSchedule)) {
      errors.push(
        `El horario de fin (${datetimeRange.end.time}) no está dentro del horario de atención del ${endDay}`,
      );
    }

    // 5. Si la reserva cruza medianoche, validar ambos días
    if (datetimeRange.start.date !== datetimeRange.end.date) {
      // Validar que el negocio esté abierto hasta tarde el primer día
      // y desde temprano el segundo día (si aplica)
      // Esto depende de tu política de negocio
    }

    // 6. Validar que la reserva no salte entre intervalos del mismo día
    // (ej: 11:00-13:00 cuando hay descanso de 12:00-14:00)
    if (startDay === endDay) {
      const daySchedules = schedule[startDay] || [];
      const spansMultipleIntervals = !daySchedules.some(
        (interval) =>
          startMinutes >= interval.open && endMinutes <= interval.close,
      );

      if (spansMultipleIntervals) {
        errors.push(
          "La reserva no puede abarcar múltiples intervalos o periodos de descanso",
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      details: {
        startDay,
        startTimeMinutes: startMinutes,
        endDay,
        endTimeMinutes: endMinutes,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Error validando horario: ${(error as Error).message}`],
    };
  }
};

// ===== INTEGRACIÓN CON ZOD =====

/**
 * Crea un refinamiento Zod para validar horarios laborales
 */
export const createBusinessHoursRefinement = (
  schedule: WeeklySchedule,
  timezone?: string,
) => {
  return (data: DateTimeRange) => {
    const result = validateBusinessHours(data, schedule, timezone);
    return result.isValid;
  };
};
