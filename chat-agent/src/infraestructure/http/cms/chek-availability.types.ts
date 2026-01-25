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

interface TimeWindow {
  from: string;
  to: string;
  totalPeople: number;
  slots: AppointmentSlot[];
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
    openTime: string; // iso datetime
    closeTime: string; // iso datetime
  }[];
}
