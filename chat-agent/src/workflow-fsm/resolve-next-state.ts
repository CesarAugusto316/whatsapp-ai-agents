import {
  CustomerActions,
  FlowOptions,
  FMStatus,
  ReservationInput,
  ReservationStatuses,
} from "../types/reservation/reservation.types";

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
export function resolveNextState(status: FMStatus): StateTransition {
  switch (status) {
    // CREATE
    case FlowOptions.MAKE_RESERVATION:
      return {
        nextStatus: ReservationStatuses.MAKE_STARTED,
        suggestedActions: [],
        messageHint: "",
      };
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
          CustomerActions.EXIT,
        ],
        messageHint:
          "If relevant, remind the user that the reservation data is complete and they may confirm, restart, or cancel.",
      };

    // UPDATE
    case FlowOptions.UPDATE_RESERVATION:
      return {
        nextStatus: ReservationStatuses.UPDATE_STARTED,
        suggestedActions: [],
        messageHint: "",
      };
    case ReservationStatuses.UPDATE_STARTED:
      return {
        nextStatus: ReservationStatuses.UPDATE_VALIDATED,
        suggestedActions: [CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation is in progress and they can continue providing data or exit.",
      };
    case ReservationStatuses.UPDATE_VALIDATED:
      return {
        nextStatus: ReservationStatuses.UPDATE_CONFIRMED,
        suggestedActions: [
          CustomerActions.CONFIRM,
          CustomerActions.RESTART,
          CustomerActions.EXIT,
        ],
        messageHint:
          "If relevant, remind the user that the reservation data is complete and they may confirm, restart, or cancel.",
      };

    // CANCEL
    case FlowOptions.CANCEL_RESERVATION:
      return {
        nextStatus: ReservationStatuses.CANCEL_STARTED,
        suggestedActions: [],
        messageHint: "",
      };
    case ReservationStatuses.CANCEL_STARTED:
      return {
        nextStatus: ReservationStatuses.CANCEL_VALIDATED,
        suggestedActions: [CustomerActions.CONFIRM, CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation cancellation is in progress and they can confirm or exit.",
      };

    default:
      return {
        nextStatus: status,
        suggestedActions: [],
        messageHint: "",
      };
  }
}
