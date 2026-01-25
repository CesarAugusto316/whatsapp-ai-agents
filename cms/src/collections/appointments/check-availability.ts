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
  isRequestedDateTimeAvailable: boolean;
  neededSlots?: TimeWindow[];
  timeWindow?: TimeWindow[];
  requestedDay?: string;
  scheduleForTheRequestedDay?: {
    openTime: Date;
    closeTime: Date;
  }[];
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

// Helper functions for schedule and timezone handling
export function getDayScheduleForDate(
  business: Business,
  utcdate: Date,
): { schedule: { open: number; close: number }[]; weekDay?: WeekDayKey } {
  const zonedDate = new Date(utcdate);

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = zonedDate.getDay();
  const weekday = DayMap[dayOfWeek] satisfies WeekDayKey;

  // Get schedule for the day, ensuring it's an array
  const daySchedule = business.schedule[weekday];
  if (!daySchedule || !Array.isArray(daySchedule)) {
    return { schedule: [] };
  }
  return { schedule: daySchedule, weekDay: weekday };
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
      slots: inside.map(
        ({
          createdAt,
          customer,
          id,
          startDateTime,
          status,
          endDateTime,
          numberOfPeople,
        }) => ({
          id,
          createdAt,
          customer,
          startDateTime,
          status,
          endDateTime,
          numberOfPeople,
        }),
      ),
    } satisfies TimeWindow);
  }

  return result;
}
