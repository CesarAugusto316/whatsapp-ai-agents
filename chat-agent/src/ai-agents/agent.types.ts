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

/**
 *
 * @description Enum for intention classification
 */
export enum InputIntent {
  INPUT_DATA = "INPUT_DATA",
  CUSTOMER_QUESTION = "CUSTOMER_QUESTION",
}

export type AgentArgs = {
  messages: ModelMessage[];
  business: Business;
  customerPhone: string;
};

export const ReservationStatuses = {
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

export type ReservationStatus = keyof typeof ReservationStatuses;

export type ReservationInput = Pick<
  Appointment,
  "customerName" | "startDateTime" | "endDateTime" | "day" | "numberOfPeople"
>;

export type FlowOption = "1" | "2";
export type FMStatus = ReservationStatus | FlowOption;

export const FlowOptions = {
  MAKE_RESERVATION: "1",
  UPDATE_RESERVATION: "2",
} as const;

export const CustomerActions = {
  CONFIRM: "CONFIRMAR",
  RESTART: "REINGRESAR",
  EXIT: "SALIR",
  UPDATE: "CAMBIAR",
  CANCEL: "CANCELAR",
  YES: "SI",
  NO: "NO",
} as const;

export interface ReservationState extends ReservationInput {
  id: string;
  status: FMStatus;
  customerPhone: string;
  customerId: string;
  businessId: string;
  attempts: number;
}

export interface StateTransition {
  nextStatus: FMStatus;
  suggestedActions: string[];
  messageHint: string; // opcional, solo para LLM
}

/**
 *
 * @description Derives guidance for the conversation based on the current reservation status.
 * @param status
 * @returns
 */
export function getStateTransition(
  status: FMStatus,
  action?: "CAMBIAR" | "CANCELAR",
): StateTransition {
  switch (status) {
    case ReservationStatuses.MAKE_STARTED:
      return {
        nextStatus: ReservationStatuses.MAKE_VALIDATED,
        suggestedActions: [CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation is in progress and they can continue providing data or exit.",
      };

    case ReservationStatuses.MAKE_VALIDATED:
      return {
        nextStatus: ReservationStatuses.MAKE_CONFIRMED,
        suggestedActions: [
          CustomerActions.CONFIRM,
          CustomerActions.RESTART,
          CustomerActions.CANCEL,
        ],
        messageHint:
          "If relevant, remind the user that the reservation data is complete and they may confirm, restart, or cancel.",
      };

    case ReservationStatuses.UPDATE_PRE_START:
      return {
        nextStatus:
          action && action == CustomerActions?.UPDATE
            ? ReservationStatuses.UPDATE_STARTED
            : ReservationStatuses.CANCEL_STARTED,
        suggestedActions: [CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user can enter the ID of his reservation or exit.",
      };

    case ReservationStatuses.UPDATE_STARTED:
      return {
        nextStatus: ReservationStatuses.UPDATE_VALIDATED,
        suggestedActions: [CustomerActions.CANCEL],
        messageHint:
          "If relevant, remind the user that a reservation is in progress and they can continue providing data or exit.",
      };

    case ReservationStatuses.UPDATE_VALIDATED:
      return {
        nextStatus: ReservationStatuses.UPDATE_CONFIRMED,
        suggestedActions: [
          CustomerActions.CONFIRM,
          CustomerActions.RESTART,
          CustomerActions.CANCEL,
        ],
        messageHint:
          "If relevant, remind the user that the reservation data is complete and they may confirm, restart, or cancel.",
      };

    case ReservationStatuses.CANCEL_STARTED:
      return {
        nextStatus: ReservationStatuses.CANCEL_VALIDATED,
        suggestedActions: [CustomerActions.CONFIRM, CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation cancellation is in progress and they can confirm or exit.",
      };

    case FlowOptions.UPDATE_RESERVATION:
      return {
        nextStatus: ReservationStatuses.UPDATE_STARTED,
        suggestedActions: [],
        messageHint: "",
      };

    case FlowOptions.MAKE_RESERVATION:
      return {
        nextStatus: ReservationStatuses.MAKE_STARTED,
        suggestedActions: [],
        messageHint: "",
      };

    default:
      return {
        nextStatus: status,
        suggestedActions: [],
        messageHint: "",
      };
  }
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
