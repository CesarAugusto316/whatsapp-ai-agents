import {
  CustomerSignals,
  MainOptions,
  FMStatus,
  BookingStatuses,
  BookingState,
} from "@/domain/booking";
import { BookingSchema } from "@/domain/booking/input-parser/booking-schemas";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { stateMessages } from "./messages";
import { ParsedBookingData } from "@/domain/booking/input-parser";

export interface BookingStateTransition {
  nextState?: FMStatus;
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
class ProductOrderStateManager {
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
      timeZone?: string;
      domain?: SpecializedDomain;
      data?: Partial<BookingState>;
    },
  ): BookingStateTransition {
    const { data, timeZone, domain = "restaurant" } = params || {};

    switch (status) {
      // CREATE
      case MainOptions.MAKE_BOOKING:
        return {
          nextState: BookingStatuses.MAKE_STARTED,
          message: stateMessages[BookingStatuses.MAKE_STARTED]({
            domain,
            data,
          }),
        };
      case BookingStatuses.MAKE_STARTED:
        return {
          nextState: BookingStatuses.MAKE_VALIDATED,
          message: stateMessages[BookingStatuses.MAKE_VALIDATED]({
            domain,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.MAKE_VALIDATED + CustomerSignals.CONFIRM:
        return {
          nextState: BookingStatuses.MAKE_CONFIRMED,
          message: stateMessages[BookingStatuses.MAKE_CONFIRMED]({
            domain,
            signal: CustomerSignals.CONFIRM,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.MAKE_VALIDATED + CustomerSignals.EXIT:
        return {
          nextState: undefined,
          message: stateMessages[BookingStatuses.MAKE_CONFIRMED]({
            domain,
            signal: CustomerSignals.EXIT,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.MAKE_VALIDATED + CustomerSignals.RESTART:
        return {
          nextState: BookingStatuses.MAKE_STARTED,
          message: stateMessages[BookingStatuses.MAKE_CONFIRMED]({
            domain,
            signal: CustomerSignals.RESTART,
            data,
            timeZone,
          }),
        };

      // UPDATE
      case MainOptions.UPDATE_BOOKING:
        return {
          nextState: BookingStatuses.UPDATE_STARTED,
          message: stateMessages[BookingStatuses.UPDATE_STARTED]({
            domain,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.UPDATE_STARTED:
        return {
          nextState: BookingStatuses.UPDATE_VALIDATED,
          message: stateMessages[BookingStatuses.UPDATE_VALIDATED]({
            domain,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.UPDATE_VALIDATED + CustomerSignals.CONFIRM:
        return {
          nextState: BookingStatuses.UPDATE_CONFIRMED,
          message: stateMessages[BookingStatuses.UPDATE_CONFIRMED]({
            domain,
            signal: CustomerSignals.CONFIRM,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.UPDATE_VALIDATED + CustomerSignals.EXIT:
        return {
          nextState: undefined,
          message: stateMessages[BookingStatuses.UPDATE_CONFIRMED]({
            domain,
            signal: CustomerSignals.EXIT,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.UPDATE_VALIDATED + CustomerSignals.RESTART:
        return {
          nextState: BookingStatuses.UPDATE_STARTED,
          message: stateMessages[BookingStatuses.UPDATE_CONFIRMED]({
            domain,
            signal: CustomerSignals.RESTART,
            data,
            timeZone,
          }),
        };

      // CANCEL
      case MainOptions.CANCEL_BOOKING:
        return {
          nextState: BookingStatuses.CANCEL_VALIDATED,
          message: stateMessages[BookingStatuses.CANCEL_VALIDATED]({
            domain,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.CANCEL_VALIDATED + CustomerSignals.CONFIRM:
        return {
          nextState: BookingStatuses.CANCEL_CONFIRMED,
          message: stateMessages[BookingStatuses.CANCEL_CONFIRMED]({
            domain,
            data,
          }),
        };

      default:
        return {
          nextState: status as FMStatus,
          message: "",
        };
    }
  }

  /**
   * Fusiona el estado entrante con el estado previo de la reserva
   */
  mergeState(
    incoming: Partial<BookingSchema> | ParsedBookingData,
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
}

export const productOrderStateManager = new ProductOrderStateManager();
