import { Appointment, Business } from "@/payload-types";
// import { fromZonedTime, toZonedTime } from "date-fns-tz";

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
  totalSlotReservations: number;
  isRequestedDateTimeAvailable: boolean;
  timeWindow?: TimeWindow[];
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
  utcdate: Date,
): { open: number; close: number }[] {
  const zonedDate = new Date(utcdate);

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = zonedDate.getDay();
  const weekday = DayMap[dayOfWeek] satisfies WeekDayKey;

  // Get schedule for the day, ensuring it's an array
  const daySchedule = business.schedule[weekday];
  if (!daySchedule || !Array.isArray(daySchedule)) {
    return [];
  }
  return daySchedule;
}

export interface TimeWindow {
  from: string;
  to: string;
  totalPeople: number;
  slots: AppointmentSlot[];
}

export function bucketByHour(
  globalStartISO: string,
  globalEndISO: string,
  suggested: AppointmentSlot[],
): TimeWindow[] {
  const HOUR = 60 * 60 * 1000;

  const globalStart = new Date(globalStartISO).getTime();
  const globalEnd = new Date(globalEndISO).getTime();

  const events = suggested.map((e) => ({
    ...e,
    start: new Date(e.startDateTime).getTime(),
    end: new Date(e.endDateTime).getTime(),
  }));

  const result = [];

  for (let slotStart = globalStart; slotStart < globalEnd; slotStart += HOUR) {
    const slotEnd = slotStart + HOUR;

    const inside = events.filter((e) => e.start < slotEnd && e.end > slotStart);

    if (inside.length === 0) {
      result.push({
        from: new Date(slotStart).toISOString(),
        to: new Date(slotEnd).toISOString(),
        totalPeople: 0,
        slots: [],
      } satisfies TimeWindow);
      continue;
    }

    const totalPeople = inside.reduce((sum, e) => sum + e.numberOfPeople, 0);

    result.push({
      from: new Date(slotStart).toISOString(),
      to: new Date(slotEnd).toISOString(),
      totalPeople,
      slots: inside.map(({ start, end, ...rest }) => rest),
    } satisfies TimeWindow);
  }

  return result;
}
