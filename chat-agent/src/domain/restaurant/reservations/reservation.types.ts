import { ReservationSchema } from "./schemas";
import { Business } from "@/infraestructure/adapters/cms";
import { ChatMessage } from "@/infraestructure/adapters/ai";

export const BOOL = {
  YES: true,
  NO: false,
} as const;

export enum CUSTOMER_INTENT {
  WHAT = "WHAT",
  HOW = "HOW",
}

/**
 *
 * @description Enum for intention classification
 */
export enum InputIntent {
  INPUT_DATA = "INPUT_DATA",
  CUSTOMER_QUESTION = "CUSTOMER_QUESTION",
}

export type AgentArgs = {
  messages: ChatMessage[];
  business: Business;
  customerPhone: string;
};

export const ReservationStatuses = {
  MAKE_STARTED: "MAKE_STARTED",
  MAKE_RESTARTED: "MAKE_RESTARTED",
  MAKE_VALIDATED: "MAKE_VALIDATED",
  MAKE_CONFIRMED: "MAKE_CONFIRMED",

  UPDATE_STARTED: "UPDATE_STARTED",
  UPDATE_RESTARTED: "UPDATE_RESTARTED",
  UPDATE_VALIDATED: "UPDATE_VALIDATED",
  UPDATE_CONFIRMED: "UPDATE_CONFIRMED",

  CANCEL_STARTED: "CANCEL_STARTED",
  CANCEL_VALIDATED: "CANCEL_VALIDATED",
  CANCEL_CONFIRMED: "CANCEL_CONFIRMED",
} as const;

export type ReservationStatus = keyof typeof ReservationStatuses;

export interface ReservationState extends ReservationSchema {
  id: string;
  status: FMStatus;
  customerId: string;
  businessId: string;
  attempts: number;
}

export type FlowOption = "1" | "2" | "3";
export type FMStatus = ReservationStatus | FlowOption;

export const FlowOptions = {
  MAKE_RESERVATION: "1",
  UPDATE_RESERVATION: "2",
  CANCEL_RESERVATION: "3",
} as const;

export const CustomerActions = {
  CONFIRM: "CONFIRMAR",
  RESTART: "REINGRESAR",
  EXIT: "SALIR",
} as const;

export type CustomerActionKey = keyof typeof CustomerActions;

export type CustomerActionValue =
  | typeof CustomerActions.CONFIRM
  | typeof CustomerActions.RESTART
  | typeof CustomerActions.EXIT;
