import { Appointment, Business } from "@/payload-types";

export interface AvailabilityRequest {
  depth: string;
  where: {
    business: { equals: string };
    startDateTime: { equals: string };
    endDateTime: { equals: string };
    numberOfPeople: { equals: string };
  };
}

export interface AvailabilityResponse {
  success: boolean;
  message?: string;
  businessId: string;
  requestedStart: string;
  requestedEnd: string;
  requestedPeople?: number;
  totalCapacityPerHour: number;
  overlappingSlots: AppointmentSlot[];
  totalSlotReservations: number;
  isRequestedDateTimeAvailable: boolean;
  suggestedTimes?: string[];
}

export type AppointmentSlot = Pick<
  Appointment,
  | "startDateTime"
  | "endDateTime"
  | "numberOfPeople"
  | "status"
  | "createdAt"
  | "customer"
  | "id"
>;

export interface AvailabilityResult {
  totalSlotReservations: number;
  overlappingSlots: AppointmentSlot[];
  isRequestedDateTimeAvailable: boolean;
}

type WeekDay = Omit<Business["schedule"], "averageTime">;
export type WeekDayKey = keyof WeekDay;

/**
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getDay
 */
export const DayMap: Record<number, WeekDayKey> = {
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
  /**
   *
   * @description the exact start date
   */
  startDate: Date;
  /**
   *
   * @description the exact end date
   */
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
  appointments = [],
  maxCapacityPerHour = 20,
  numberOfPeople = 1,
  startDate,
  endDate,
}: Partial<CalcArgs>): AvailabilityResult {
  const overlappingSlots: AppointmentSlot[] = [];

  // Crear copias para no modificar los parámetros originales
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalizar a horas completas: start hacia abajo, end hacia arriba si tiene minutos
  start.setMinutes(0, 0, 0);

  // Redondear end hacia arriba si tiene minutos, segundos o milisegundos
  if (
    end.getMinutes() > 0 ||
    end.getSeconds() > 0 ||
    end.getMilliseconds() > 0
  ) {
    end.setHours(end.getHours() + 1);
  }
  end.setMinutes(0, 0, 0);

  // Si end es anterior o igual a start, ajustar a 1 hora después
  if (end <= start) {
    end.setTime(start.getTime() + 60 * 60 * 1000);
  }

  let currentHour = new Date(start);

  // we advance 1 hour by adding 60 minutes to the current hour, for example time maybe from 20:30 to 23:30
  // 3 hours, so this loope will iterate 3 times
  while (currentHour < end) {
    const hourStart = new Date(currentHour);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    // Encontrar reservas que se superponen con esta hora
    appointments
      .filter((appointment) => {
        const apptStart = new Date(appointment.startDateTime);
        const apptEnd = appointment.endDateTime
          ? new Date(appointment.endDateTime)
          : new Date(apptStart.getTime() + 60 * 60 * 1000); // 1 hora por defecto

        // Verificar si la reserva se superpone con esta hora
        return apptStart < hourEnd && apptEnd > hourStart;
      })
      .forEach((appointment) => {
        const isPushed = overlappingSlots.find(
          (slot) => slot.id === appointment.id,
        );
        if (!isPushed) {
          overlappingSlots.push(appointment);
        }
      });

    // Avanzar a la siguiente hora
    currentHour = hourEnd;
  }

  const totalSlotReservations = overlappingSlots.reduce(
    (sum, appt) => sum + (appt.numberOfPeople || 0),
    0,
  );

  return {
    totalSlotReservations,
    overlappingSlots,
    isRequestedDateTimeAvailable:
      maxCapacityPerHour - totalSlotReservations >= numberOfPeople,
  };
}

/**
 *
 * Genera sugerencias de horarios alternativos (pura)
 * Esta versión NO hace llamadas a la base de datos
 */
export function suggestAlternativeTimes({
  appointments = [],
  hoursToCheck = 4,
  intervalMinutes = 30,
  maxCapacityPerHour = 20,
  numberOfPeople = 1,
  startDate,
}: Partial<CalcArgs>): string[] {
  const suggestedTimes: string[] = [];
  const now = new Date();

  // Validar parámetros requeridos
  if (!startDate) {
    return suggestedTimes;
  }

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

    // Filtrar solo reservas confirmed o pending
    const validAppointments = overlappingAppointments.filter(
      (appt) => appt.status === "confirmed" || appt.status === "pending",
    );

    // Calcular personas ya reservadas en esta hora
    const reservedPeople = validAppointments.reduce(
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

  // Si no se encontraron sugerencias, intentar buscar en el mismo horario pero en horas diferentes
  if (suggestedTimes.length === 0) {
    // Buscar en el mismo día pero en diferentes horas
    const sameDaySearchStart = new Date(startDate);
    sameDaySearchStart.setHours(0, 0, 0, 0);
    const sameDaySearchEnd = new Date(sameDaySearchStart);
    sameDaySearchEnd.setHours(23, 59, 59, 999);

    // Buscar todas las reservas del mismo día
    const sameDayAppointments = appointments.filter((appointment) => {
      const apptDate = new Date(appointment.startDateTime);
      return apptDate >= sameDaySearchStart && apptDate <= sameDaySearchEnd;
    });

    // Probar horas en incrementos de 1 hora durante el día
    for (let hour = 9; hour <= 21; hour++) {
      // de 9 AM a 9 PM
      const testTime = new Date(startDate);
      testTime.setHours(hour, 0, 0, 0);

      // No sugerir tiempos en el pasado
      if (testTime < now) continue;

      // Calcular disponibilidad para esta hora
      const testHourStart = new Date(testTime);
      testHourStart.setMinutes(0, 0, 0);
      const testHourEnd = new Date(testHourStart.getTime() + 60 * 60 * 1000);

      const overlappingAppointments = sameDayAppointments.filter(
        (appointment) => {
          const apptStart = new Date(appointment.startDateTime);
          const apptEnd = appointment.endDateTime
            ? new Date(appointment.endDateTime)
            : new Date(apptStart.getTime() + 60 * 60 * 1000);

          return apptStart < testHourEnd && apptEnd > testHourStart;
        },
      );

      const validAppointments = overlappingAppointments.filter(
        (appt) => appt.status === "confirmed" || appt.status === "pending",
      );

      const reservedPeople = validAppointments.reduce(
        (sum, appt) => sum + (appt.numberOfPeople || 0),
        0,
      );

      if (maxCapacityPerHour - reservedPeople >= numberOfPeople) {
        suggestedTimes.push(testTime.toISOString());
        if (suggestedTimes.length >= 3) break;
      }
    }
  }

  return suggestedTimes;
}
