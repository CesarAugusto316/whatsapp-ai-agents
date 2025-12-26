import { Business } from "@/types/business/cms-types";
import { ModelMessage } from "ai";

export const AVAILABLE = {
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

export enum ReservationStep {
  STARTED = "STARTED",
  UPDATING = "UPDATING",
  RE_STARTED = "RE_STARTED",
  VALIDATED = "VALIDATED",
  CONFIRMED = "CONFIRMED",
}

export interface ReservationState {
  id: string;
  step: ReservationStep;
  type: "MAKE" | "UPDATE" | "CANCEL";
  customerId: string;
  customerName: string;
  customerPhone: string;
  businessId: string;
  startTime: string;
  day: string;
  numberOfPeople: number;
}

export enum CustomerActions {
  CONFIRM = "CONFIRMAR",
  RESTART = "REINGRESAR",
  EXIT = "SALIR",
  UPDATE = "CAMBIAR",
  CANCEL = "CANCELAR",
  YES = "SI",
  NO = "NO",
}

export enum FlowOptions {
  GENERAL_INFO = "1",
  MAKE_RESERVATION = "2",
  UPDATE_RESERVATION = "3",
  HOW_SYSTEM_WORKS = "4",
}

export type ReservationInput = {
  name?: string;
  day: string;
  startTime: string;
  numberOfPeople: number;
};

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
