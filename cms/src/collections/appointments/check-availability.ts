import { Appointment, Business } from "@/payload-types";
import { fromZonedTime } from "date-fns-tz";

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

export function getSuggestedDateTimes({
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

// Helper functions for schedule and timezone handling
export function getDayScheduleForDate(
  business: Business,
  date: Date,
  timezone: string,
): { open: number; close: number }[] {
  // Get day of week in business timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });
  const weekday = formatter.format(date).toLowerCase() as WeekDayKey;

  // Get schedule for the day, ensuring it's an array
  const daySchedule = business.schedule[weekday];
  if (!daySchedule || !Array.isArray(daySchedule)) {
    return [];
  }
  return daySchedule;
}

export function getScheduleIndex(
  schedule: { open: number; close: number }[],
  date: Date,
  timezone: string,
): number {
  const minutesFromMidnight = utcDateToMinutesFromMidnight(date, timezone);

  for (let i = 0; i < schedule.length; i++) {
    const slot = schedule[i];
    if (minutesFromMidnight >= slot.open && minutesFromMidnight <= slot.close) {
      return i; // Return index of the slot (0 for morning, 1 for afternoon)
    }
  }
  return -1; // Not in any schedule slot
}

/**
 * Convert UTC Date to minutes from midnight in business timezone
 * @param date UTC Date object
 * @param timezone Business timezone string (e.g., "Europe/Madrid")
 * @returns Minutes from midnight in business local time
 */
function utcDateToMinutesFromMidnight(date: Date, timezone: string): number {
  // Format the UTC date to get local time parts in business timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour")?.value || "0";
  const minutePart = parts.find((p) => p.type === "minute")?.value || "0";

  const hour = parseInt(hourPart, 10);
  const minute = parseInt(minutePart, 10);

  return hour * 60 + minute;
}
