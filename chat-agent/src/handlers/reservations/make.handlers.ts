import {
  buildApiDates,
  parseStringReservation,
} from "@/ai-agents/tools/helpers";
import { FlowHandler } from "../handlers.types";
import { safeParse } from "zod";
import { reserveSchema } from "@/ai-agents/schemas";
import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import {
  CustomerActions,
  ReservationState,
  reservationStatuses,
} from "@/ai-agents/agent.types";
import { reservationMessages } from "@/ai-agents/tools/prompts";
import { Appointment, Customer } from "@/types/business/cms-types";

export const makeStarted: FlowHandler = async (ctx) => {
  const {
    RESERVATION_CACHE,
    business,
    customerMessage,
    customer,
    reservationKey,
  } = ctx;

  // FINAL OPTION: 2. SALIR
  if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
    await reservationCacheService.delete(reservationKey ?? "");
    const assistantMsg = reservationMessages.getExitMsg();
    return assistantMsg;
  }

  const parseInput = parseStringReservation(
    customerMessage,
    customer?.name ? 3 : 4,
  );
  if (!parseInput.success) {
    return parseInput.error ?? "Datos inválidos";
  }
  const { success, data, error } = safeParse(reserveSchema, parseInput.data);
  if (!success) {
    return error.message ?? "Datos inválidos";
  }
  const isAvailable = await businessService.checkAvailability(
    data?.day,
    data.startTime,
    (business?.schedule?.averageTime ?? 1) * 60,
  );
  if (!isAvailable) {
    return "Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.";
  }
  await reservationCacheService.save(reservationKey ?? "", {
    ...RESERVATION_CACHE,
    customerName: data.name ?? customer?.name,
    day: data.day,
    startTime: data.startTime,
    numberOfPeople: data.numberOfPeople,
    status: reservationStatuses.MAKE_VALIDATED,
  });
  const assistantResponse = reservationMessages.getConfirmationMsg({
    ...data,
    name: data?.name ?? customer?.name,
  });
  return assistantResponse;
};

export const makeValidated: FlowHandler = async (ctx) => {
  const {
    RESERVATION_CACHE,
    business,
    customerMessage,
    customerPhone,
    customer,
    reservationKey,
  } = ctx;

  // FINAL OPTION: 1. CONFIRMAR
  if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
    const {
      customerName = "",
      day = "",
      startTime = "",
      numberOfPeople = 1,
    } = RESERVATION_CACHE as ReservationState;
    let newCustomer = customer;

    const {
      day: reservationDay,
      endDateTime,
      startDateTime,
    } = buildApiDates(
      day,
      startTime,
      (business?.schedule?.averageTime ?? 1) * 60,
    ); // use business average reservation time

    if (!customer) {
      newCustomer = (
        (await (
          await businessService.createCostumer({
            business: business?.id ?? "",
            phoneNumber: customerPhone ?? "",
            name: customerName,
          })
        ).json()) as { doc: Customer }
      ).doc;
    }
    // finally, we create the reservation
    if (newCustomer?.id && business?.id) {
      const res = await businessService.createAppointment({
        business: business?.id,
        customer: newCustomer.id,
        startDateTime,
        customerName: newCustomer.name ?? customerName,
        numberOfPeople,
        endDateTime,
        day: reservationDay,
        status: "confirmed",
      });
      const reservation = (await res.json()) as { doc: Appointment };
      const assistantMsg = reservationMessages.getSuccessMsg(reservation?.doc, {
        customerName: newCustomer.name ?? customerName,
        numberOfPeople,
        restaurantName: business?.name ?? "",
      });
      await reservationCacheService.delete(reservationKey ?? "");
      return assistantMsg;
    }
    return "Cliente no pudo ser creado";
  }

  // FINAL OPTION: 2. SALIR
  if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
    await reservationCacheService.delete(reservationKey ?? "");
    const assistantMsg = reservationMessages.getExitMsg();
    return assistantMsg;
  }

  // FINAL OPTION: 3. REINGRESAR DATOS
  if (customerMessage?.toUpperCase() === CustomerActions.RESTART) {
    // RESTART
    const assistantResponse = reservationMessages.getReStartMsg({
      userName: customer?.name,
    });
    await reservationCacheService.save(reservationKey ?? "", {
      businessId: business?.id,
      customerId: customer?.id,
      customerName: customer?.name ?? "",
      customerPhone,
      status: reservationStatuses.MAKE_STARTED,
    });
    return assistantResponse;
  }

  // FALLBACK
  if (customerMessage) {
    const assistanceMsg = `Tienes una reserva disponible. Escribe: ${CustomerActions.CONFIRM} para confirmar reserva, ${CustomerActions.RESTART} para cambiar algun dato, ó ${CustomerActions.EXIT} para salir`;
    return assistanceMsg;
  }
};
