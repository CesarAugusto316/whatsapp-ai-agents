import { Appointment, Business } from "@/types/business/cms-types";
import { ModelMessage } from "ai";

export const BOOL = {
  YES: true,
  NO: false,
} as const;

export enum CUSTOMER_INTENT {
  WHAT = "WHAT",
  HOW = "HOW",
}

export type AgentArgs = {
  messages: ModelMessage[];
  business: Business;
  customerPhone: string;
};

export const reservationStatuses = {
  MAKE_STARTED: "MAKE_STARTED",
  MAKE_RESTARTED: "MAKE_RESTARTED",
  MAKE_VALIDATED: "MAKE_VALIDATED",
  MAKE_CONFIRMED: "MAKE_CONFIRMED",

  UPDATE_PRE_START: "UPDATE_PRE_START",
  UPDATE_STARTED: "UPDATE_STARTED",
  UPDATE_RESTARTED: "UPDATE_RESTARTED",
  UPDATE_VALIDATED: "UPDATE_VALIDATED",
  UPDATE_CONFIRMED: "UPDATE_CONFIRMED",

  CANCEL_STARTED: "CANCEL_STARTED",
  CANCEL_VALIDATED: "CANCEL_VALIDATED",
  CANCEL_CONFIRMED: "CANCEL_CONFIRMED",
} as const;

export type ReservationStatus = keyof typeof reservationStatuses;

export type ReservationInput = Pick<
  Appointment,
  "customerName" | "startDateTime" | "endDateTime" | "day" | "numberOfPeople"
>;

export interface ReservationState extends ReservationInput {
  id: string;
  status: ReservationStatus;
  customerPhone: string;
  customerId: string;
  businessId: string;
  attempts: number;
}

export const CustomerActions = {
  CONFIRM: "CONFIRMAR",
  RESTART: "REINGRESAR",
  EXIT: "SALIR",
  UPDATE: "CAMBIAR",
  CANCEL: "CANCELAR",
  YES: "SI",
  NO: "NO",
} as const;

export const FlowOptions = {
  MAKE_RESERVATION: "1",
  UPDATE_RESERVATION: "2",
} as const;

/**
 *
 * @description Enum for intention classification
 */
export enum InputIntent {
  INPUT_DATA = "INPUT_DATA",
  CUSTOMER_QUESTION = "CUSTOMER_QUESTION",
}

export type WeekDay = Omit<Business["schedule"], "averageTime">;

export const WEEK_DAYS: Array<keyof WeekDay> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
