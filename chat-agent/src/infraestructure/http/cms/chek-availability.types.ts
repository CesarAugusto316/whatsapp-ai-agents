import { Appointment } from "./cms-types";

type AppointmentSlot = Pick<
  Appointment,
  | "startDateTime"
  | "endDateTime"
  | "numberOfPeople"
  | "status"
  | "createdAt"
  | "customer"
  | "id"
>;

export interface TimeWindow {
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
  availableSlots?: TimeWindow[];
  slotsByTimeRange?: TimeWindow[];
  weekDay?: string;
  weekDaySchedule?: {
    open: string;
    close: string;
  }[];
}
