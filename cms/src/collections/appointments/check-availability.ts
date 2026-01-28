import { Appointment, Business } from "@/payload-types";

export interface AvailabilityRequest {
  depth: string;
  where: {
    business: { equals: string };
    startDateTime: { equals: string }; // UTC format
    endDateTime: { equals: string }; // UTC format
    numberOfPeople: { equals: string };
  };
}

export interface AvailabilityResponse {
  success: boolean;
  message?: string;
  businessId: string;
  startDate?: string;
  endDate?: string;
  numberOfPeople?: number;
  maxCapacityPerHour: number;
  isSlotAvailable?: boolean;
  availableSlots?: TimeWindow[];
  slotsByTimeRange?: TimeWindow[];
  weekDay?: string;
  weekDaySchedule?: {
    open: string;
    close: string;
  }[];
}

export interface TimeWindow {
  from: string;
  to: string;
  totalPeople: number;
  slots: AppointmentSlot[];
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
export function getCurrentDaySchedule(
  business: Business,
  utcdate: Date,
): { daySchedule: { open: number; close: number }[]; weekDay?: WeekDayKey } {
  //
  const zonedDate = new Date(utcdate); // we copy the date to avoid mutating the original

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = zonedDate.getDay();
  const weekday = DayMap[dayOfWeek] satisfies WeekDayKey;

  // Get schedule for the day, ensuring it's an array
  const daySchedule = business.schedule[weekday];
  if (!daySchedule || !Array.isArray(daySchedule)) {
    return { daySchedule: [] };
  }
  return { daySchedule, weekDay: weekday };
}

export function calcSlotsByHour(
  openRange: string,
  closeRange: string,
  slots: AppointmentSlot[],
): TimeWindow[] {
  //
  const HOUR = 60 * 60 * 1000;
  const globalOpen = new Date(openRange).getTime();
  const globalClose = new Date(closeRange).getTime();

  const events = slots.map((e) => ({
    ...e,
    _start: new Date(e.startDateTime).getTime(),
    _end: new Date(e.endDateTime).getTime(),
  }));

  const result = [];

  for (let slotStart = globalOpen; slotStart < globalClose; slotStart += HOUR) {
    const slotEnd = slotStart + HOUR;

    const inside = events.filter(
      (e) => e._start < slotEnd && e._end > slotStart,
    );

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
      slots: inside.map(({ _start, _end, ...rest }) => rest),
    } satisfies TimeWindow);
  }

  return result;
}
