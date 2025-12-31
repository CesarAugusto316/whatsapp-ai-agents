import { StateHandler } from "../handlers.types";
import z, { safeParse } from "zod";
import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import {
  CustomerActions,
  ReservationInput,
  ReservationState,
  reservationStatuses,
  InputIntent,
  FlowOptions,
  ReservationStatus,
  getStateTransition,
} from "@/ai-agents/agent.types";
import { systemMessages } from "@/ai-agents/tools/prompts";
import { Appointment } from "@/types/business/cms-types";
import {
  humanizerAgent,
  inputIntentClassifier,
  validationAgent,
} from "@/ai-agents/agent.config";
import { ATTEMPTS } from "./make.handlers";
import { AppContext } from "@/types/hono.types";

const preStart: StateHandler<AppContext, ReservationStatus> = async (
  ctx,
  currStatus,
) => {
  const { RESERVATION_CACHE, customerMessage, reservationKey, customer } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }
  // START
  if (!RESERVATION_CACHE?.id) {
    const { success, data } = safeParse(z.uuidv4(), customerMessage.trim());
    if (!success) {
      return humanizerAgent(
        "Por favor, ingresa un ID de reserva válido, sólo dame tu ID, sin texto extra",
      );
    }
    const res = await businessService.getAppointmentById(data);

    if (res.status !== 200) {
      return humanizerAgent(
        "Reserva no encontrada. Seguro que escribiste  el ID correcto?",
      );
    }
    const reservation = (await res.json()) as Appointment;

    // 2. ✅ INPUT DATA VALIDATED
    const responseMsg = `
        Exelente, hemos verificado que tienes una reserva confirmada con el
        id ${reservation.id} a nombre de ${reservation.customerName}
        para ${reservation.numberOfPeople} personas ahora.
        Escribe la palabra:
        - ${CustomerActions.UPDATE} si deseas actualizar la reserva ó
        - ${CustomerActions.CANCEL} para cancelarla.
    `;
    await reservationCacheService.save(reservationKey, {
      ...RESERVATION_CACHE,
      id: reservation.id,
    });
    return humanizerAgent(responseMsg);
  }

  // 1. MODIFY RESERVATION
  if (
    customerMessage?.toUpperCase() === CustomerActions.UPDATE &&
    RESERVATION_CACHE?.id
  ) {
    const responseMsg = systemMessages.getStartMsg(
      {
        userName: customer?.name,
      },
      "update",
    );
    const transition = getStateTransition(currStatus, CustomerActions.UPDATE);
    await reservationCacheService.save(reservationKey ?? "", {
      ...RESERVATION_CACHE,
      status: transition.nextStatus, //  UPDATE_STARTED,
    });
    return humanizerAgent(responseMsg);
  }

  // 2. CANCEL RESERVATION
  if (
    customerMessage?.toUpperCase() === CustomerActions.CANCEL &&
    RESERVATION_CACHE?.id
  ) {
    const responseMsg = `
      Seguro que desea cancelar tu reserva?. Escribe:
      - ${CustomerActions.YES} para confirmar o
      - ${CustomerActions.NO} para salir de este proceso.
    `;
    const transition = getStateTransition(currStatus, CustomerActions.CANCEL);
    await reservationCacheService.save(reservationKey ?? "", {
      ...RESERVATION_CACHE,
      status: transition.nextStatus, //CANCEL_STARTED,
    });
    return humanizerAgent(responseMsg);
  }

  // FALLBACK
  if (customerMessage && RESERVATION_CACHE?.id) {
    const assistanceMsg = `
      Tienes una reserva disponible con ID ${RESERVATION_CACHE.id}. Escribe:
      - ${CustomerActions.UPDATE} para actualizar reserva, ó
      - ${CustomerActions.CANCEL} para cancelarla`;
    return humanizerAgent(assistanceMsg);
  }
};

const started: StateHandler<AppContext, ReservationStatus> = async (
  ctx,
  currStatus,
) => {
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

  const previousState = {
    customerName: RESERVATION_CACHE?.customerName || customer?.name || "",
    day: RESERVATION_CACHE?.day || "",
    startDateTime: RESERVATION_CACHE?.startDateTime || "",
    endDateTime: RESERVATION_CACHE?.endDateTime,
    numberOfPeople: RESERVATION_CACHE?.numberOfPeople || 0,
    //
  } satisfies ReservationInput;

  try {
    // OPTION: 1. SALIR
    if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
      await reservationCacheService.delete(reservationKey);
      const responseMsg = systemMessages.getExitMsg();
      return humanizerAgent(responseMsg);
    }
    if ((RESERVATION_CACHE?.attempts ?? 0) >= ATTEMPTS) {
      await reservationCacheService.delete(reservationKey);
      return humanizerAgent(`
        Has llegado al límite de intentos fallidos al checkear disponibilidad.
        Empecemos de nuevo desde cero. Escribe "${FlowOptions.UPDATE_RESERVATION}"
        para iniciar otro proceso de reserva.
      `);
    }
    const inputIntent = await inputIntentClassifier(customerMessage);

    if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
      return InputIntent.CUSTOMER_QUESTION;
      // This breaks the flow and the fallback AGENT takes control
      // (Just for this time)
    }

    if (RESERVATION_CACHE?.id) {
      // ✅ All fields are required here
      const result = await validationAgent.parser(
        business,
        customerMessage,
        previousState,
      );
      if (!result) {
        return humanizerAgent(
          "Lo siento no pude comprender tus datos, podrias escribirlos de nuevo con mas claridad ?",
        );
      }
      const { mergedData, parsedData } = result;
      const { success, data, error } = parsedData;

      if (!success) {
        await reservationCacheService.save(reservationKey, {
          ...RESERVATION_CACHE,
          ...mergedData,
        } satisfies Partial<ReservationState>);

        const aiDataCollector = validationAgent.collector(business, error);
        return aiDataCollector;
      }

      /**
       *
       * @todo debemos que validar si la nueva fecha o
       * rango de tiempo (startTime - endTime) esta libre exluyendo
       * la fecha que ya tenemos seleccionada, hay que evaluar algunas condiciones
       * antes de asignar un nuevo timeSlot
       */
      const isAvailable = await businessService.checkAvailability({
        "where[day][equals]": data.day ?? "",
        "where[startDateTime][equals]": data.startDateTime ?? "",
        "where[endDateTime][equals]": data.endDateTime ?? "",
      });
      if (!isAvailable) {
        const retries = (RESERVATION_CACHE?.attempts || 0) + 1;
        await reservationCacheService.save(reservationKey, {
          ...RESERVATION_CACHE,
          ...data,
          attempts: retries,
        } satisfies Partial<ReservationState>);

        return humanizerAgent(
          `
            Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.
            Tienes ${ATTEMPTS - retries} intentos restantes.
          `,
        );
      }

      // 2. ✅ INPUT DATA VALIDATED
      const transition = getStateTransition(currStatus);
      await reservationCacheService.save(reservationKey, {
        ...RESERVATION_CACHE,
        ...data,
        status: transition.nextStatus, // UPDATE_VALIDATED,
      } satisfies Partial<ReservationState>);

      const responseMsg = systemMessages.getConfirmationMsg(data, "update");
      return humanizerAgent(responseMsg);
    }

    await reservationCacheService.save(reservationKey, {
      ...RESERVATION_CACHE,
      id: "",
      status: reservationStatuses.UPDATE_PRE_START,
    } satisfies Partial<ReservationState>);

    return "No ingresaste el ID de tu reserva, vuelve a ingresarlo";
  } catch (error) {
    //
    // BORRAR CACHE y REINICIAR
    return humanizerAgent(
      "Ocurrió un problema inesperado. ¿Podemos intentar de nuevo con los datos de la reserva?",
    );
  }
};

const validated: StateHandler<AppContext, ReservationStatus> = async (ctx) => {
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
      startDateTime = "",
      endDateTime = "",
      numberOfPeople = 1,
    } = RESERVATION_CACHE as ReservationState;

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
          day,
          status: "confirmed",
        },
      );
      const reservation = (await res.json()) as { doc: Appointment };
      const responseMsg = systemMessages.getSuccessMsg(reservation?.doc, {
        customerName: customer?.name,
        numberOfPeople,
        restaurantName: business?.name ?? "",
        mode: "update",
      });
      await reservationCacheService.delete(reservationKey ?? "");
      return humanizerAgent(responseMsg);
    }
    return humanizerAgent("Customer not created");
  }

  // FINAL OPTION: 2. SALIR
  if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
    await reservationCacheService.delete(reservationKey ?? "");
    const assistantMsg = systemMessages.getExitMsg();
    return assistantMsg;
  }

  // FINAL OPTION: 3. REINGRESAR DATOS
  if (customerMessage?.toUpperCase() === CustomerActions.RESTART) {
    // RESTART
    const assistantResponse = systemMessages.getStartMsg({
      userName: customer?.name,
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
  // if (customerMessage) {
  //   const assistanceMsg = `Tienes una reserva disponible. Escribe: ${CustomerActions.CONFIRM} para confirmar reserva, ${CustomerActions.RESTART} para cambiar algun dato, ó ${CustomerActions.EXIT} para salir`;
  //   return humanizerAgent(assistanceMsg);
  // }
};

export const updateHandlers = { preStart, started, validated };
