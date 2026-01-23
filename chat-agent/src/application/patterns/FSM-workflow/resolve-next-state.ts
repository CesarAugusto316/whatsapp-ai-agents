import {
  CustomerActionValue,
  CustomerActions,
  FlowOptions,
  FMStatus,
  ReservationStatuses,
} from "@/domain/restaurant/reservations";
import { ChatMessage } from "@/infraestructure/http/ai";

// Mapa de mensajes para el usuario por estado
const STATE_MESSAGES: Partial<Record<FMStatus, string>> = {
  // Estados de CREACIÓN
  [ReservationStatuses.MAKE_STARTED]:
    "📝 *Tienes una reserva en curso.*\nContinúa proporcionando los datos necesarios.",
  [ReservationStatuses.MAKE_RESTARTED]:
    "🔄 *Has reiniciado tu reserva.*\nVuelve a ingresar tus datos",
  [ReservationStatuses.MAKE_VALIDATED]:
    "✅ *Datos validados correctamente.*\n¿Quieres confirmar la reserva?",
  [ReservationStatuses.MAKE_CONFIRMED]: "🎉 *¡Reserva confirmada!*",

  // Estados de ACTUALIZACIÓN
  [ReservationStatuses.UPDATE_STARTED]:
    "✏️ *Tienes una modificación en curso.*\nProporciona los nuevos datos para actualizar.",
  [ReservationStatuses.UPDATE_RESTARTED]:
    "🔄 *Has reiniciado la modificación.*\nVuelve a ingresar tus datos",
  [ReservationStatuses.UPDATE_VALIDATED]:
    "✅ *Cambios validados correctamente.*\n¿Quieres confirmar la modificación?",
  [ReservationStatuses.UPDATE_CONFIRMED]: "🔄 *¡Modificación confirmada!*",

  // Estados de CANCELACIÓN
  [ReservationStatuses.CANCEL_STARTED]: "🗑️ *Has iniciado una cancelación.*",
  [ReservationStatuses.CANCEL_VALIDATED]:
    "⚠️ *¿Estás seguro de cancelar la reserva?*\nConfirma para proceder con la cancelación.",
  [ReservationStatuses.CANCEL_CONFIRMED]: "❌ *¡Reserva cancelada!*",
} as const;

export interface StateTransition {
  nextState: FMStatus;
  suggestedActions: string[];
  messageHint: string; // opcional, solo para LLM
  userMessage?: string; // mensaje amigable para el usuario
}

/**
 * @todo generalize this function and the FSM
 * @description Derives guidance for the conversation based on the current reservation status.
 * @param status
 * @returns
 */
export function resolveNextState(
  status: FMStatus,
  action?: CustomerActionValue,
): StateTransition {
  //
  const condition = status + (action ?? ""); // "hi" + (undefined ?? "") = "hi"

  switch (condition) {
    // CREATE
    case FlowOptions.MAKE_RESERVATION:
      return {
        nextState: ReservationStatuses.MAKE_STARTED,
        suggestedActions: [],
        messageHint: "",
        userMessage: STATE_MESSAGES[condition],
      };
    case ReservationStatuses.MAKE_STARTED:
      return {
        userMessage: STATE_MESSAGES[condition],
        nextState: ReservationStatuses.MAKE_VALIDATED,
        suggestedActions: [CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation is in progress and they can continue providing data or exit.",
      };
    case ReservationStatuses.MAKE_VALIDATED:
      return {
        userMessage: STATE_MESSAGES[condition],
        nextState: ReservationStatuses.MAKE_CONFIRMED,
        suggestedActions: [
          CustomerActions.CONFIRM,
          CustomerActions.RESTART,
          CustomerActions.EXIT,
        ],
        messageHint:
          "If relevant, remind the user that the reservation data is complete and they may confirm, restart, or cancel.",
      };
    case ReservationStatuses.MAKE_VALIDATED + CustomerActions.RESTART:
      return {
        nextState: ReservationStatuses.MAKE_STARTED,
        suggestedActions: [],
        messageHint: "",
      };

    // UPDATE
    case FlowOptions.UPDATE_RESERVATION:
      return {
        userMessage: STATE_MESSAGES[condition],
        nextState: ReservationStatuses.UPDATE_STARTED,
        suggestedActions: [],
        messageHint: "",
      };
    case ReservationStatuses.UPDATE_STARTED:
      return {
        userMessage: STATE_MESSAGES[condition],
        nextState: ReservationStatuses.UPDATE_VALIDATED,
        suggestedActions: [CustomerActions.EXIT],
        messageHint:
          "If relevant, remind the user that a reservation is in progress and they can continue providing data or exit.",
      };
    case ReservationStatuses.UPDATE_VALIDATED:
      return {
        userMessage: STATE_MESSAGES[condition],
        nextState: ReservationStatuses.UPDATE_CONFIRMED,
        suggestedActions: [
          CustomerActions.CONFIRM,
          CustomerActions.RESTART,
          CustomerActions.EXIT,
        ],
        messageHint:
          "If relevant, remind the user that the reservation data is complete and they may confirm, restart, or cancel.",
      };
    case ReservationStatuses.UPDATE_VALIDATED + CustomerActions.RESTART:
      return {
        nextState: ReservationStatuses.UPDATE_STARTED,
        suggestedActions: [],
        messageHint: "",
      };

    // CANCEL
    case FlowOptions.CANCEL_RESERVATION:
      return {
        userMessage: STATE_MESSAGES[condition],
        nextState: ReservationStatuses.CANCEL_VALIDATED,
        suggestedActions: [],
        messageHint: "",
      };
    case ReservationStatuses.CANCEL_VALIDATED:
      return {
        userMessage: STATE_MESSAGES[condition],
        nextState: ReservationStatuses.CANCEL_CONFIRMED,
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

/**
 * Attaches a process reminder to an original message based on the current reservation status.
 * Uses predefined user messages for each state and includes suggested actions if available.
 *
 * @param originalMessage - The original message from the system or LLM
 * @param status - The current reservation process status (FMStatus)
 * @param guidance - State transition object containing userMessage and suggestedActions
 * @returns The original message with an appended process reminder in Spanish
 *
 * @example
 * // When there's an active process with suggested actions
 * const message = attachProcessReminder(
 *   "El sábado nuestro horario es de 12:00 a 23:00 horas.",
 *   "MAKE_VALIDATED",
 *   {
 *     userMessage: "✅ *Datos validados correctamente.*\n¿Quieres confirmar la reserva?",
 *     suggestedActions: ["CONFIRMAR", "REINICIAR", "SALIR"]
 *   }
 * );
 * // Returns:
 * // "El sábado nuestro horario es de 12:00 a 23:00 horas.
 * //
 * // ✅ *Datos validados correctamente.*
 * // ¿Quieres confirmar la reserva?
 * //
 * // Para continuar, puedes:
 * // • CONFIRMAR
 * // • REINICIAR
 * // • SALIR"
 *
 * @example
 * // When there's an active process without suggested actions
 * const message = attachProcessReminder(
 *   "Nuestro menú incluye opciones vegetarianas.",
 *   "MAKE_STARTED",
 *   {
 *     userMessage: "📝 *Tienes una reserva en curso.*\nContinúa proporcionando los datos necesarios.",
 *     suggestedActions: []
 *   }
 * );
 * // Returns:
 * // "Nuestro menú incluye opciones vegetarianas.
 * //
 * // 📝 *Tienes una reserva en curso.*
 * // Continúa proporcionando los datos necesarios."
 *
 * @example
 * // When there's no active process
 * const message = attachProcessReminder(
 *   "Los viernes cerramos a las 23:00 horas.",
 *   "",
 *   undefined
 * );
 * // Returns: "Los viernes cerramos a las 23:00 horas."
 */
export function attachProcessReminder(
  originalMessage: string,
  status: FMStatus,
  messages: ChatMessage[],
): string {
  // If no guidance, status, or userMessage, return original message
  const guidance = resolveNextState(status);
  if (!guidance || !status || !guidance.userMessage?.trim()) {
    return originalMessage;
  }

  // Start with the user message
  let reminder = guidance.userMessage;

  // Add suggested actions if they exist
  if (guidance.suggestedActions && guidance.suggestedActions.length > 0) {
    const actionsList = guidance.suggestedActions
      .map((action) => `• ${action}`)
      .join("\n");
    reminder += `\n\nPara continuar, escribe:\n${actionsList}`;
  }

  const hasReminder = messages
    .filter((msg) => msg.role === "assistant") // reminder always will be included in assistant messages
    .some((msg) => msg.content.includes(reminder));

  if (hasReminder) {
    return originalMessage;
  }

  // Return original message followed by the reminder
  return `${originalMessage.trim()}\n\n${reminder}`;
}
