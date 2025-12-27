import {
  buildApiDates,
  parseStringReservation,
} from "@/ai-agents/tools/helpers";
import { FlowHandler } from "../handlers.types";
import { safeParse, string } from "zod";
import { reserveSchema } from "@/ai-agents/schemas";
import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import {
  CustomerActions,
  ReservationState,
  reservationStatuses,
} from "@/ai-agents/agent.types";
import { flowMessages, reservationMessages } from "@/ai-agents/tools/prompts";
import { Appointment } from "@/types/business/cms-types";

export const updatePreStart: FlowHandler = async (ctx) => {
  const { RESERVATION_CACHE, customerMessage, reservationKey, customer } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }
  // START
  if (!RESERVATION_CACHE?.id) {
    const { success, data } = safeParse(
      string().min(2).max(60),
      customerMessage.trim(),
    );
    if (!success) {
      return "Por favor, ingresa un ID válido entre 2 y 60 caracteres.";
    }
    const reservation = (await (
      await businessService.getAppointmentById(data)
    ).json()) as Appointment;

    if (!reservation) {
      return "Reserva no encontrada. Escribe un ID válido.";
    }
    const assistantResponse = `Escribe la palabra ${CustomerActions.UPDATE} para actualizar la reserva. o ${CustomerActions.CANCEL} para cancelarla.`;
    await reservationCacheService.save(reservationKey, {
      ...RESERVATION_CACHE,
      id: reservation.id,
    });
    return assistantResponse;
  }
  if (
    customerMessage?.toUpperCase() === CustomerActions.UPDATE &&
    RESERVATION_CACHE?.id
  ) {
    const assistantResponse = reservationMessages.getStartMsg({
      userName: customer?.name,
      mode: "update",
    });
    await reservationCacheService.save(reservationKey ?? "", {
      ...RESERVATION_CACHE,
      status: reservationStatuses.UPDATE_STARTED,
    });
    return assistantResponse;
  }
  if (
    customerMessage?.toUpperCase() === CustomerActions.CANCEL &&
    RESERVATION_CACHE?.id
  ) {
    const assistantResponse = `Seguro que desea cancelar su reserva? esta accion no se puede revertir. Escribe ${CustomerActions.YES} para confirmar o ${CustomerActions.NO} para cancelar`;
    await reservationCacheService.save(reservationKey ?? "", {
      ...RESERVATION_CACHE,
      status: reservationStatuses.CANCEL_STARTED,
    });
    return assistantResponse;
  }
};

export const updateStarted: FlowHandler = async (ctx) => {
  const {
    RESERVATION_CACHE,
    customerMessage,
    reservationKey,
    customer,
    business,
  } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  if (RESERVATION_CACHE?.id) {
    const parseInput = parseStringReservation(customerMessage, 3); // customerName already provided
    if (!parseInput.success) {
      return (
        parseInput.error ?? "Por favor, proporciona una fecha y hora válidas"
      );
    }
    const { success, data, error } = safeParse(reserveSchema, parseInput.data);
    if (!success) {
      return error.message ?? "Por favor, proporciona una fecha y hora válidas";
    }
    const isAvailable = await businessService.checkAvailability(
      data?.day,
      data.startTime,
      business.schedule.averageTime * 60,
    );
    if (!isAvailable) {
      return "Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.";
    }
    await reservationCacheService.save(reservationKey, {
      ...RESERVATION_CACHE,
      customerName: customer?.name,
      day: data.day,
      startTime: data.startTime,
      numberOfPeople: data.numberOfPeople,
      status: reservationStatuses.UPDATE_VALIDATED,
    });
    const assistantResponse = reservationMessages.getConfirmationMsg(
      {
        ...data,
        name: customer?.name,
      },
      "update",
    );
    return assistantResponse;
  }
};

export const updateValidated: FlowHandler = async (ctx) => {
  const {
    RESERVATION_CACHE,
    customerMessage,
    reservationKey,
    customer,
    business,
  } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  // FINAL OPTION: 1. CONFIRMAR
  if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
    const {
      day = "",
      startTime = "",
      numberOfPeople = 1,
    } = RESERVATION_CACHE as ReservationState;
    const {
      day: reservationDay,
      endDateTime,
      startDateTime,
    } = buildApiDates(day, startTime, business.schedule.averageTime * 60); // use business average reservation time

    // finally, we create the reservation
    if (customer?.id && business?.id && RESERVATION_CACHE?.id) {
      const res = await businessService.updateAppointment(
        RESERVATION_CACHE?.id,
        {
          business: business?.id,
          customer: customer?.id,
          startDateTime,
          endDateTime,
          numberOfPeople,
          customerName: customer.name ?? "",
          day: reservationDay,
          status: "confirmed",
        },
      );
      const reservation = (await res.json()) as { doc: Appointment };
      const assistantMsg = reservationMessages.getSuccessMsg(reservation?.doc, {
        customerName: customer?.name,
        numberOfPeople,
        restaurantName: business?.name ?? "",
        mode: "update",
      });
      await reservationCacheService.delete(reservationKey ?? "");
      return assistantMsg;
    }
    return "Customer not created";
  }

  // FINAL OPTION: 2. SALIR
  if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
    await reservationCacheService.delete(reservationKey ?? "");
    const assistantMsg = flowMessages.getExitMsg();
    return assistantMsg;
  }

  // FINAL OPTION: 3. REINGRESAR DATOS
  if (customerMessage?.toUpperCase() === CustomerActions.RESTART) {
    // RESTART
    const assistantResponse = reservationMessages.getReStartMsg({
      userName: customer?.name,
      mode: "update",
    });
    await reservationCacheService.save(reservationKey ?? "", {
      ...RESERVATION_CACHE,
      businessId: business?.id,
      customerId: customer?.id,
      customerName: customer?.name ?? "",
      customerPhone: customer.phoneNumber,
      status: reservationStatuses.UPDATE_STARTED,
    });
    return assistantResponse;
  }

  // FALLBACK
  if (customerMessage) {
    const assistanceMsg = `Tienes una reserva disponible. Escribe: ${CustomerActions.CONFIRM} para confirmar reserva, ${CustomerActions.RESTART} para cambiar algun dato, ó ${CustomerActions.EXIT} para salir`;
    return assistanceMsg;
  }
};
