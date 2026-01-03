import { StateWorkflowHandler } from "@/workflow-fsm/state-workflow.types";
import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import {
  CustomerActions,
  ReservationState,
  ReservationStatuses,
  InputIntent,
  FlowOptions,
  FMStatus,
} from "@/types/reservation/reservation.types";
import { Appointment, Customer } from "@/types/business/cms-types";
import {
  humanizerAgent,
  inputIntentClassifier,
  validationAgent,
} from "@/llm/llm.config";
import { AppContext } from "@/types/hono.types";
import { resolveNextState } from "@/workflow-fsm/resolve-next-state";
import { systemMessages } from "@/llm/prompts/system-messages";
import { mergeReservationData } from "@/helpers/merge-state";
import { isWithinBusinessHours } from "@/helpers/isDateWithinSchedule";
import { localDateTimeToUTC } from "@/helpers/datetime-converters";

export const ATTEMPTS = 4;

/**
 *
 * @param ctx
 * @param currStatus
 * @returns
 */
const started: StateWorkflowHandler<AppContext, FMStatus> = async (
  ctx,
  currStatus,
) => {
  const {
    RESERVATION_CACHE,
    business,
    customerMessage,
    reservationKey,
    customer,
  } = ctx;

  if (!RESERVATION_CACHE) return;

  const previousState = mergeReservationData(RESERVATION_CACHE, {
    customerName: customer?.name,
  });

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
        Empecemos de nuevo desde cero. Escribe "${FlowOptions.MAKE_RESERVATION}"
        para iniciar otro proceso de reserva.
      `);
    }
    const inputIntent = await inputIntentClassifier(customerMessage);

    if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
      return InputIntent.CUSTOMER_QUESTION;
      // This breaks the flow and the fallback AGENT takes control
      // (Just for this time)
    }

    // ✅ All fields are required here
    const result = await validationAgent.parser(
      business,
      customerMessage,
      previousState,
    );
    if (!result) {
      // very low probability to happen
      return humanizerAgent(
        "Lo siento no pude comprender tus datos, podrias escribirlos de nuevo con mas claridad ?",
      );
    }
    const { parsedData, mergedData } = result;
    const { success, data, error } = parsedData;

    if (!success) {
      await reservationCacheService.save(reservationKey, {
        ...RESERVATION_CACHE,
        ...mergedData,
      } satisfies Partial<ReservationState>);

      const aiDataCollector = validationAgent.collector(business, error);
      return aiDataCollector; // agent tries to collect missing data
    }

    const timezone = business.general.timezone;
    const { start, end } = data.datetime;
    const isWithinSchedule = {
      start: isWithinBusinessHours(business.schedule, timezone, start),
      end: isWithinBusinessHours(business.schedule, timezone, end),
    };

    console.log({
      data,
      isWithinSchedule,
      schedule: JSON.stringify(business.schedule),
      timezone,
    });

    if (!isWithinSchedule.start || !isWithinSchedule.end) {
      /** @todo proponer otras fechas de reservación */
      return `
        😔 Lo sentimos, la fecha y hora seleccionada no está dentro del horario
        de atención del negocio. Por favor, selecciona otra fecha y hora.
      `;
    }
    const startDateTime = localDateTimeToUTC(start, timezone);
    const endDateTime = localDateTimeToUTC(end, timezone);

    const isAvailable = await businessService.checkAvailability({
      "where[numberOfPeople][equals]": data.numberOfPeople,
      "where[startDateTime][equals]": startDateTime,
      "where[endDateTime][equals]": endDateTime,
    });
    if (!isAvailable) {
      const retries = (RESERVATION_CACHE?.attempts || 0) + 1;
      await reservationCacheService.save(reservationKey, {
        ...RESERVATION_CACHE,
        ...data,
        attempts: retries,
      } satisfies Partial<ReservationState>);

      /** @todo MOSTRAR OTRAS FECHAS U HORARIOS DISPONIBLES PARA MEJOR UX */
      return humanizerAgent(
        `
          Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.
          Tienes ${ATTEMPTS - retries} intentos restantes.
        `,
      );
    }

    // 2. ✅ INPUT DATA VALIDATED
    const transition = resolveNextState(currStatus);
    await reservationCacheService.save(reservationKey, {
      ...RESERVATION_CACHE,
      ...data,
      status: transition.nextState, // MAKE_VALIDATED
    } satisfies Partial<ReservationState>);

    const responseMsg = systemMessages.getConfirmationMsg(data);
    return humanizerAgent(responseMsg);
  } catch (error) {
    // BORRAR CACHE y REINICIAR
    return humanizerAgent(
      "Ocurrió un problema inesperado. ¿Podemos intentar de nuevo con los datos de la reserva?",
    );
  }
};

/**
 *
 * @param ctx
 * @returns
 */
const validated: StateWorkflowHandler<AppContext, FMStatus> = async (ctx) => {
  const {
    RESERVATION_CACHE,
    business,
    customerMessage,
    customerPhone,
    customer,
    reservationKey,
  } = ctx;

  if (!RESERVATION_CACHE) return;

  // FINAL OPTION: 1. CONFIRMAR
  if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
    } = RESERVATION_CACHE as ReservationState;

    let newCustomer = customer;
    if (!customer && customerName) {
      newCustomer = (
        (await (
          await businessService.createCostumer({
            business: business?.id || "",
            phoneNumber: customerPhone || "",
            name: customerName,
          })
        ).json()) as { doc: Customer }
      ).doc;
    }
    // finally, we create the reservation
    if (newCustomer?.id && business?.id) {
      const timezone = business.general.timezone;
      const startDateTime = localDateTimeToUTC(datetime?.start, timezone);
      const endDateTime = localDateTimeToUTC(datetime?.end, timezone);
      const res = await businessService.createAppointment({
        business: business.id,
        customer: newCustomer.id,
        startDateTime,
        endDateTime,
        customerName: newCustomer.name || customerName,
        numberOfPeople,
        status: "confirmed",
      });
      const reservation = (await res.json()) as { doc: Appointment };
      const assistantMsg = systemMessages.getSuccessMsg(reservation?.doc);
      await reservationCacheService.delete(reservationKey ?? "");
      return humanizerAgent(assistantMsg);
    }
    return humanizerAgent("Cliente no pudo ser creado, falta el nombre");
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
    const assistantResponse = systemMessages.getCreateMsg(
      {
        userName: customer?.name,
      },
      "update",
    );
    await reservationCacheService.save(reservationKey ?? "", {
      businessId: business?.id,
      customerId: customer?.id,
      ...RESERVATION_CACHE,
      status: ReservationStatuses.MAKE_STARTED,
    });
    return humanizerAgent(assistantResponse);
  }

  // // FALLBACK
  // if (customerMessage && RESERVATION_CACHE) {
  //   const assistanceMsg = `
  //     Tienes una reserva disponible. Escribe:
  //     - ${CustomerActions.CONFIRM} para confirmar reserva ó
  //     - ${CustomerActions.RESTART} para cambiar algun dato que quieras cambiar
  //     - ${CustomerActions.EXIT} para salir de este proceso
  //     `;
  //   return humanizerAgent(assistanceMsg);
  // }
};

export const makeWorflow = { started, validated };
