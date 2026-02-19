import {
  CustomerSignalKey,
  CustomerSignals,
  BookingOptions,
  FMStatus,
  BookingStatuses,
  BookingState,
} from "@/domain/booking";
import { ChatMessage } from "@/infraestructure/adapters/ai";
import { BookingSchema } from "@/domain/booking/input-parser/booking-schemas";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { stateMessages } from "./state-messages";

export interface BookingStateTransition {
  nextState: FMStatus;
  suggestedActions: string[];
  messageHint?: string;
  /**
   * Mensaje template determinístico para enviar al usuario después de la transición.
   * Se genera automáticamente basado en el estado, dominio y datos.
   *
   * @see getBookingStateMessage en domain/booking/prompts/helpers/state-messages.ts
   */
  message: string;
}

/**
 * Manager para el estado del proceso de reserva
 */
class BookingStateManager {
  //

  /**
   * Deriva el siguiente estado basado en el estado actual y la acción del usuario.
   * Genera automáticamente el mensaje template para enviar al usuario.
   *
   * @param status - Estado actual o acción del usuario
   * @param action - Acción del usuario (opcional)
   * @param params - Parámetros adicionales para generar el mensaje
   * @param params.data - Datos de la reserva (para mensajes que requieren estado)
   * @param params.timeZone - Zona horaria del negocio
   * @param params.domain - Dominio especializado (restaurant, medical, etc.)
   * @param params.userName - Nombre del usuario (para mensajes personalizados)
   */
  nextState(
    status: string,
    params?: {
      data?: Partial<BookingState>;
      timeZone?: string;
      domain?: SpecializedDomain;
      userName?: string;
    },
  ): BookingStateTransition {
    const { data, timeZone, domain = "restaurant", userName } = params || {};

    switch (status) {
      // CREATE
      case BookingOptions.MAKE_BOOKING:
        return {
          nextState: BookingStatuses.MAKE_STARTED,
          suggestedActions: [],
          message: stateMessages[BookingStatuses.MAKE_STARTED]({
            domain,
            userName,
          }),
        };
      case BookingStatuses.MAKE_STARTED:
        return {
          nextState: BookingStatuses.MAKE_VALIDATED,
          suggestedActions: [CustomerSignals.EXIT],
          message: stateMessages[BookingStatuses.MAKE_VALIDATED]({
            domain,
            mode: "create",
            data,
            timeZone,
          }),
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
          // refactor pass: CONFIRM | RESTART | EXIT
          message: stateMessages[BookingStatuses.MAKE_CONFIRMED]({
            domain,
            mode: "create",
            data,
            timeZone,
          }),
          messageHint:
            "Recordar al usuario que los datos están completos y puede confirmar, reiniciar o salir.",
        };
      case BookingStatuses.MAKE_VALIDATED + CustomerSignals.RESTART:
        return {
          nextState: BookingStatuses.MAKE_STARTED,
          suggestedActions: [],
          message: "",
        };

      // UPDATE
      case BookingOptions.UPDATE_BOOKING:
        return {
          nextState: BookingStatuses.UPDATE_STARTED,
          suggestedActions: [],
          message: stateMessages[BookingStatuses.UPDATE_STARTED]({
            domain,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.UPDATE_STARTED:
        return {
          nextState: BookingStatuses.UPDATE_VALIDATED,
          suggestedActions: [CustomerSignals.EXIT],
          message: "",
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
          message: stateMessages[BookingStatuses.UPDATE_VALIDATED]({
            domain,
            mode: "update",
            data,
            timeZone,
          }),
        };
      case BookingStatuses.UPDATE_VALIDATED + CustomerSignals.RESTART:
        return {
          nextState: BookingStatuses.UPDATE_STARTED,
          suggestedActions: [],
          message: "",
        };

      // CANCEL
      case BookingOptions.CANCEL_BOOKING:
        return {
          nextState: BookingStatuses.CANCEL_VALIDATED,
          suggestedActions: [],
          message: stateMessages[BookingStatuses.CANCEL_VALIDATED]({
            domain,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.CANCEL_VALIDATED:
        return {
          nextState: BookingStatuses.CANCEL_CONFIRMED,
          suggestedActions: [CustomerSignals.CONFIRM, CustomerSignals.EXIT],
          messageHint:
            "Recordar al usuario que hay una cancelación en curso y puede confirmar o salir.",
          message: stateMessages[BookingStatuses.CANCEL_VALIDATED]({
            domain,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.CANCEL_VALIDATED + CustomerSignals.CONFIRM:
        return {
          nextState: BookingStatuses.CANCEL_CONFIRMED,
          suggestedActions: [],
          message: stateMessages[BookingStatuses.CANCEL_CONFIRMED]({
            domain,
            data,
          }),
        };

      default:
        return {
          nextState: status as FMStatus,
          suggestedActions: [],
          message: "",
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
   * @deprecated Usar templateMessage directamente del nextState()
   */
  attachProcessReminder(
    originalMessage: string,
    status: FMStatus,
    messages: ChatMessage[],
  ): string {
    const transition = this.nextState(status);
    const userMessage = transition.message;

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
