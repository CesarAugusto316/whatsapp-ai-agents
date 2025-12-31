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
  status: ReservationStatus;
  customerPhone: string;
  customerId: string;
  businessId: string;
  attempts: number;
}

export interface ConversationGuidance {
  nextStatus: ReservationStatus;
  suggestedActions: string[];
  messageHint: string; // opcional, solo para LLM
}

/**
 *
 * @description Derives guidance for the conversation based on the current reservation status.
 * @param status
 * @returns
 */
export function deriveGuidance(
  status: ReservationStatus,
): ConversationGuidance | undefined {
  switch (status) {
    case reservationStatuses.MAKE_STARTED:
      return {
        nextStatus: reservationStatuses.MAKE_VALIDATED,
        suggestedActions: [CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation is in progress and they can continue providing data or exit.",
      };

    case reservationStatuses.MAKE_VALIDATED:
      return {
        nextStatus: reservationStatuses.MAKE_CONFIRMED,
        suggestedActions: [
          CustomerActions.CONFIRM,
          CustomerActions.RESTART,
          CustomerActions.CANCEL,
        ],
        messageHint:
          "If relevant, remind the user that the reservation data is complete and they may confirm, restart, or cancel.",
      };

    case reservationStatuses.UPDATE_PRE_START:
      return {
        nextStatus: reservationStatuses.UPDATE_STARTED,
        suggestedActions: [CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user can enter the ID of his reservation or exit.",
      };

    case reservationStatuses.UPDATE_STARTED:
      return {
        nextStatus: reservationStatuses.UPDATE_VALIDATED,
        suggestedActions: [CustomerActions.CANCEL],
        messageHint:
          "If relevant, remind the user that a reservation is in progress and they can continue providing data or exit.",
      };

    case reservationStatuses.UPDATE_VALIDATED:
      return {
        nextStatus: reservationStatuses.UPDATE_CONFIRMED,
        suggestedActions: [
          CustomerActions.CONFIRM,
          CustomerActions.RESTART,
          CustomerActions.CANCEL,
        ],
        messageHint:
          "If relevant, remind the user that the reservation data is complete and they may confirm, restart, or cancel.",
      };

    case reservationStatuses.CANCEL_STARTED:
      return {
        nextStatus: reservationStatuses.CANCEL_VALIDATED,
        suggestedActions: [CustomerActions.CONFIRM, CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation cancellation is in progress and they can confirm or exit.",
      };
  }
}

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
