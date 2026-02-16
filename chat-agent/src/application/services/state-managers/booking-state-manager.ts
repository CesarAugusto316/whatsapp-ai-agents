import {
  CustomerActionValue,
  CustomerSignals,
  BookingOptions,
  FMStatus,
  BookingStatuses,
} from "@/domain/booking";
import { ChatMessage } from "@/infraestructure/adapters/ai";
import { BookingSchema } from "@/domain/booking/input-parser/booking-schemas";

export interface BookingStateTransition {
  nextState: FMStatus;
  suggestedActions: string[];
  messageHint?: string;
  userMessage?: string;
}

/**
 * Manager para el estado del proceso de reserva
 */
class BookingStateManager {
  //
  private static readonly STATE_MESSAGES: Record<FMStatus, string> = {
    [BookingStatuses.MAKE_STARTED]:
      "📝 *Tienes una reserva en curso.*\nContinúa proporcionando los datos necesarios.",
    [BookingStatuses.MAKE_VALIDATED]:
      "✅ *Datos validados correctamente.*\n¿Quieres confirmar la reserva?",
    [BookingStatuses.MAKE_CONFIRMED]: "✅ *Reserva confirmada.*",
    [BookingStatuses.UPDATE_STARTED]:
      "📝 *Tienes una actualización en curso.*\nContinúa proporcionando los datos necesarios.",
    [BookingStatuses.UPDATE_VALIDATED]:
      "✅ *Datos validados correctamente.*\n¿Quieres confirmar la actualización?",
    [BookingStatuses.UPDATE_CONFIRMED]: "✅ *Reserva actualizada.*",
    [BookingStatuses.CANCEL_VALIDATED]:
      "⚠️ *Cancelación en curso.*\n¿Confirmas que deseas cancelar?",
    [BookingStatuses.CANCEL_CONFIRMED]: "❌ *Reserva cancelada.*",
    [BookingOptions.MAKE_BOOKING]: "",
    [BookingOptions.UPDATE_BOOKING]: "",
    [BookingOptions.CANCEL_BOOKING]: "",
    [BookingStatuses.MAKE_RESTARTED]: "",
    [BookingStatuses.UPDATE_RESTARTED]: "",
    [BookingStatuses.CANCEL_STARTED]: "",
  };

  /**
   * Deriva el siguiente estado basado en el estado actual y la acción del usuario
   */
  nextState(
    status: FMStatus,
    action?: CustomerActionValue,
  ): BookingStateTransition {
    const condition = status + (action ?? "");

    switch (condition) {
      // CREATE
      case BookingOptions.MAKE_BOOKING:
        return {
          nextState: BookingStatuses.MAKE_STARTED,
          suggestedActions: [],
        };
      case BookingStatuses.MAKE_STARTED:
        return {
          nextState: BookingStatuses.MAKE_VALIDATED,
          suggestedActions: [CustomerSignals.EXIT],
          messageHint:
            "Recordar al usuario que hay una reserva en curso y puede continuar o salir.",
        };
      case BookingStatuses.MAKE_VALIDATED:
        return {
          nextState: BookingStatuses.MAKE_CONFIRMED,
          suggestedActions: [
            CustomerSignals.CONFIRM,
            CustomerSignals.RESTART,
            CustomerSignals.EXIT,
          ],
          messageHint:
            "Recordar al usuario que los datos están completos y puede confirmar, reiniciar o salir.",
        };
      case BookingStatuses.MAKE_VALIDATED + CustomerSignals.RESTART:
        return {
          nextState: BookingStatuses.MAKE_STARTED,
          suggestedActions: [],
        };

      // UPDATE
      case BookingOptions.UPDATE_BOOKING:
        return {
          nextState: BookingStatuses.UPDATE_STARTED,
          suggestedActions: [],
        };
      case BookingStatuses.UPDATE_STARTED:
        return {
          nextState: BookingStatuses.UPDATE_VALIDATED,
          suggestedActions: [CustomerSignals.EXIT],
          messageHint:
            "Recordar al usuario que hay una actualización en curso y puede continuar o salir.",
        };
      case BookingStatuses.UPDATE_VALIDATED:
        return {
          nextState: BookingStatuses.UPDATE_CONFIRMED,
          suggestedActions: [
            CustomerSignals.CONFIRM,
            CustomerSignals.RESTART,
            CustomerSignals.EXIT,
          ],
          messageHint:
            "Recordar al usuario que los datos están completos y puede confirmar, reiniciar o salir.",
        };
      case BookingStatuses.UPDATE_VALIDATED + CustomerSignals.RESTART:
        return {
          nextState: BookingStatuses.UPDATE_STARTED,
          suggestedActions: [],
        };

      // CANCEL
      case BookingOptions.CANCEL_BOOKING:
        return {
          nextState: BookingStatuses.CANCEL_VALIDATED,
          suggestedActions: [],
        };
      case BookingStatuses.CANCEL_VALIDATED:
        return {
          nextState: BookingStatuses.CANCEL_CONFIRMED,
          suggestedActions: [CustomerSignals.CONFIRM, CustomerSignals.EXIT],
          messageHint:
            "Recordar al usuario que hay una cancelación en curso y puede confirmar o salir.",
        };

      default:
        return {
          nextState: status,
          suggestedActions: [],
        };
    }
  }

  /**
   * Fusiona el estado entrante con el estado previo de la reserva
   */
  mergeState(
    incoming: Partial<BookingSchema>,
    previous?: Partial<BookingSchema>,
  ): BookingSchema {
    return {
      customerName:
        incoming.customerName?.trim() || previous?.customerName?.trim() || "",
      datetime: {
        start: {
          date:
            incoming.datetime?.start?.date ||
            previous?.datetime?.start?.date ||
            "",
          time:
            incoming.datetime?.start?.time ||
            previous?.datetime?.start?.time ||
            "",
        },
        end: {
          date:
            incoming.datetime?.end?.date || previous?.datetime?.end?.date || "",
          time:
            incoming.datetime?.end?.time || previous?.datetime?.end?.time || "",
        },
      },
      numberOfPeople: incoming.numberOfPeople || previous?.numberOfPeople || 0,
    };
  }

  /**
   * Adjunta un recordatorio del proceso de reserva a un mensaje original
   */
  attachProcessReminder(
    originalMessage: string,
    status: FMStatus,
    messages: ChatMessage[],
  ): string {
    const transition = this.nextState(status);
    const userMessage =
      transition.userMessage || BookingStateManager.STATE_MESSAGES[status];

    if (!status || !userMessage?.trim()) {
      return originalMessage;
    }

    let reminder = userMessage;

    if (transition.suggestedActions.length > 0) {
      const actionsList = transition.suggestedActions
        .map((action) => `• ${action}`)
        .join("\n");
      reminder += `\n\nPara continuar, escribe:\n${actionsList}`;
    }

    const hasReminder = messages
      .filter((msg) => msg.role === "assistant")
      .some((msg) => msg.content.includes(reminder));

    if (hasReminder) {
      return originalMessage;
    }

    return `${originalMessage.trim()}\n\n${reminder}`;
  }
}

export const bookingStateManager = new BookingStateManager();
