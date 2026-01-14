import { CustomerActions, FlowOptions, FMStatus, ReservationStatuses } from "@/domain/restaurant/reservations/reservation.types";

export interface StateTransition {
  nextState: FMStatus;
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
        nextState: ReservationStatuses.MAKE_STARTED,
        suggestedActions: [],
        messageHint: "",
      };
    case ReservationStatuses.MAKE_STARTED:
      return {
        nextState: ReservationStatuses.MAKE_VALIDATED,
        suggestedActions: [CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation is in progress and they can continue providing data or exit.",
      };
    case ReservationStatuses.MAKE_VALIDATED:
      return {
        nextState: ReservationStatuses.MAKE_CONFIRMED,
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
        nextState: ReservationStatuses.UPDATE_STARTED,
        suggestedActions: [],
        messageHint: "",
      };
    case ReservationStatuses.UPDATE_STARTED:
      return {
        nextState: ReservationStatuses.UPDATE_VALIDATED,
        suggestedActions: [CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation is in progress and they can continue providing data or exit.",
      };
    case ReservationStatuses.UPDATE_VALIDATED:
      return {
        nextState: ReservationStatuses.UPDATE_CONFIRMED,
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
        nextState: ReservationStatuses.CANCEL_STARTED,
        suggestedActions: [],
        messageHint: "",
      };
    case ReservationStatuses.CANCEL_STARTED:
      return {
        nextState: ReservationStatuses.CANCEL_VALIDATED,
        suggestedActions: [CustomerActions.CONFIRM, CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation cancellation is in progress and they can confirm or exit.",
      };

    default:
      return {
        nextState: status,
        suggestedActions: [],
        messageHint: "",
      };
  }
}
