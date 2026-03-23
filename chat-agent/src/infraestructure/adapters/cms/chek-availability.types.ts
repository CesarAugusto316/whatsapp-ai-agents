import { Booking } from "./cms-types";

type AppointmentSlot = Pick<
  Booking,
  | "startDateTime"
  | "endDateTime"
  | "numberOfPeople"
  | "status"
  | "createdAt"
  | "customer"
  | "id"
>;

export interface TimeRangeWindow {
  from: string;
  to: string;
  totalPeople: number;
  slots: AppointmentSlot[];
}

export interface AvailabilityResponse {
  success: boolean;
  message?: string;
  businessId: string;
  startDate: string;
  endDate: string;
  numberOfPeople?: number;
  maxCapacityPerHour: number;
  isSlotAvailable: boolean;
  availableSlots?: TimeRangeWindow[];
  slotsByTimeRange?: TimeRangeWindow[];
  weekDay?: string;
  weekDaySchedule?: {
    open: string;
    close: string;
  }[];
}
