import { Business } from "@/payload-types";

export interface AvailabilityRequest {
  depth: string;
  where: {
    business: { equals: string };
    startDateTime: { equals: string };
    endDateTime: { equals: string };
    numberOfPeople: { equals: string };
  };
}

interface TimeSlot {
  hour: string;
  availableSlots: number;
  isAvailable: boolean;
}

export interface AvailabilityResponse {
  success: boolean;
  message?: string;
  businessId: string;
  requestedStart: string;
  requestedEnd: string;
  requestedPeople?: number;
  totalCapacityPerHour: number;
  availableSlotsPerHour: TimeSlot[];
  isFullyAvailable: boolean;
  suggestedTimes?: string[];
}

export interface AppointmentSlot {
  startDateTime: string;
  endDateTime?: string;
  numberOfPeople: number;
  status?: string;
}

export interface AvailabilityResult {
  timeSlots: TimeSlot[];
  isFullyAvailable: boolean;
}

type WeekDay = Omit<Business["schedule"], "averageTime">;
type Days = keyof WeekDay;

/**
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getDay
 */
export const DayMap: Record<number, Days> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

type CalcArgs = {
  appointments: AppointmentSlot[]; // only status confirmed or pending
  maxCapacityPerHour: number;
  startDate: Date;
  endDate: Date;
  numberOfPeople: number;
  hoursToCheck: number;
  intervalMinutes: number;
};

/**
 *
 * Calcula la disponibilidad puramente basado en datos existentes
 * Esta función NO hace llamadas a la base de datos
 */
export function calculateAvailability({
  appointments,
  maxCapacityPerHour,
  numberOfPeople,
  startDate,
  endDate,
}: Partial<CalcArgs>): AvailabilityResult {
  //
  const timeSlots: TimeSlot[] = [];

  // Normalizar fechas: inicio hacia abajo, fin hacia arriba
  // const normalizedStart = new Date(startDate);
  // normalizedStart.setMinutes(0, 0, 0);

  // const normalizedEnd = new Date(endDate);
  // // Redondear fin hacia arriba si no es hora exacta
  // if (
  //   normalizedEnd.getMinutes() > 0 ||
  //   normalizedEnd.getSeconds() > 0 ||
  //   normalizedEnd.getMilliseconds() > 0
  // ) {
  //   normalizedEnd.setHours(normalizedEnd.getHours() + 1);
  // }
  // normalizedEnd.setMinutes(0, 0, 0);
  // let currentHour = new Date(normalizedStart);

  startDate.setMinutes(0, 0, 0);
  endDate.setMinutes(0, 0, 0);

  while (startDate < endDate) {
    const hourStart = new Date(startDate);
    const hourEnd = new Date(endDate);

    // Encontrar reservas que se superponen con esta hora
    const overlappingAppointments = appointments.filter((appointment) => {
      const apptStart = new Date(appointment.startDateTime);
      const apptEnd = appointment.endDateTime
        ? new Date(appointment.endDateTime)
        : new Date(apptStart.getTime() + 60 * 60 * 1000); // 1 hora por defecto

      // Verificar si la reserva se superpone con esta hora
      return apptStart < hourEnd && apptEnd > hourStart;
    });

    // Sumar personas ya reservadas en esta hora
    const reservedPeople = overlappingAppointments.reduce(
      (sum, appt) => sum + (appt.numberOfPeople || 0),
      0,
    );

    const availableSlots = maxCapacityPerHour - reservedPeople;
    const isAvailable = availableSlots >= numberOfPeople;
    timeSlots.push({
      hour: hourStart.toISOString(),
      availableSlots,
      isAvailable,
    });

    // Avanzar a la siguiente hora
    startDate = hourEnd;
  }
  const isFullyAvailable = timeSlots.every((slot) => slot.isAvailable);

  return { timeSlots, isFullyAvailable };
}

/**
 *
 * Genera sugerencias de horarios alternativos (pura)
 * Esta versión NO hace llamadas a la base de datos
 */
export function suggestAlternativeTimes({
  appointments,
  hoursToCheck,
  intervalMinutes,
  maxCapacityPerHour,
  numberOfPeople,
  startDate,
}: Partial<CalcArgs>): string[] {
  //
  const suggestedTimes: string[] = [];
  const now = new Date();

  // Convertir horas a verificar a milisegundos
  const endSearchTime = startDate.getTime() + hoursToCheck * 60 * 60 * 1000;

  // Empezar desde el primer intervalo después del horario original
  let checkTime = new Date(startDate.getTime() + intervalMinutes * 60 * 1000);

  while (checkTime.getTime() <= endSearchTime) {
    // No sugerir tiempos en el pasado
    if (checkTime < now) {
      checkTime = new Date(checkTime.getTime() + intervalMinutes * 60 * 1000);
      continue;
    }

    // Para cada hora de verificación, calcular disponibilidad para esa hora específica
    const hourStart = new Date(checkTime);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    // Encontrar reservas que se superponen con esta hora
    const overlappingAppointments = appointments.filter((appointment) => {
      const apptStart = new Date(appointment.startDateTime);
      const apptEnd = appointment.endDateTime
        ? new Date(appointment.endDateTime)
        : new Date(apptStart.getTime() + 60 * 60 * 1000);

      // Verificar superposición
      return apptStart < hourEnd && apptEnd > hourStart;
    });

    // Calcular personas ya reservadas en esta hora
    const reservedPeople = overlappingAppointments.reduce(
      (sum, appt) => sum + (appt.numberOfPeople || 0),
      0,
    );

    // Verificar si hay disponibilidad
    if (maxCapacityPerHour - reservedPeople >= numberOfPeople) {
      suggestedTimes.push(checkTime.toISOString());

      // Limitar a 3 sugerencias
      if (suggestedTimes.length >= 3) break;
    }

    // Avanzar al siguiente intervalo
    checkTime = new Date(checkTime.getTime() + intervalMinutes * 60 * 1000);
  }

  return suggestedTimes;
}
