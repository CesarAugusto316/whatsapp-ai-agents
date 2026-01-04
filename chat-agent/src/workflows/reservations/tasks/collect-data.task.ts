import { mergeReservationData } from "@/helpers/merge-state";
import {
  humanizerAgent,
  inputIntentClassifier,
  validatorAgent,
} from "@/llm/llm.config";
import { ReservationMode, systemMessages } from "@/llm/prompts/system-messages";
import reservationCacheService from "@/services/reservationCache.service";
import { Business, Customer } from "@/types/business/cms-types";
import {
  CustomerActions,
  FlowOptions,
  FMStatus,
  InputIntent,
  ReservationState,
} from "@/types/reservation/reservation.types";
import { resolveNextState } from "@/workflow-fsm/resolve-next-state";
import businessService from "@/services/business.service";
import { localDateTimeToUTC } from "@/helpers/datetime-converters";
import { isWithinBusinessHours } from "@/helpers/isDateWithinSchedule";

type Args = {
  reservation: Partial<ReservationState>;
  customer?: Customer;
  business: Business;
  reservationKey: string;
  fmStatus: FMStatus;
  customerMessage: string;
  mode: ReservationMode;
};

export const ATTEMPTS = 4;

/**
 *
 * @description
 * @returns
 */
export async function collecDataTask({
  reservation,
  customer,
  business,
  reservationKey,
  fmStatus,
  customerMessage,
  mode,
}: Args) {
  //
  const previousState = mergeReservationData(reservation, {
    customerName: customer?.name || "",
  });

  try {
    // OPTION: 1. SALIR
    if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
      await reservationCacheService.delete(reservationKey);
      const responseMsg = systemMessages.getExitMsg();
      return humanizerAgent(responseMsg);
    }
    if ((reservation?.attempts ?? 0) >= ATTEMPTS) {
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

    // ✅ All fields are required here
    const result = await validatorAgent.parse(
      business,
      customerMessage,
      previousState,
    );
    if (!result) {
      return humanizerAgent(
        "Lo siento no pude comprender tus datos, podrias escribirlos de nuevo con mas claridad ?",
      );
    }
    const { parsedData, mergedData } = result;
    const { success, data, error } = parsedData;

    if (!success) {
      await reservationCacheService.save(reservationKey, {
        ...reservation,
        ...mergedData,
      } satisfies Partial<ReservationState>);

      const aiDataCollector = validatorAgent.humanizeErrors(business, error);
      return aiDataCollector;
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

    /**
     *
     * @todo debemos que validar si la nueva fecha o
     * rango de tiempo (startTime - endTime) esta libre exluyendo
     * la fecha que ya tenemos seleccionada, hay que evaluar algunas condiciones
     * antes de asignar un nuevo timeSlot
     */
    const isAvailable = await businessService.checkAvailability({
      "where[numberOfPeople][equals]": data.numberOfPeople,
      "where[startDateTime][equals]": startDateTime,
      "where[endDateTime][equals]": endDateTime,
    });
    if (!isAvailable) {
      const retries = (reservation?.attempts || 0) + 1;
      await reservationCacheService.save(reservationKey, {
        ...reservation,
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
    const transition = resolveNextState(fmStatus);
    await reservationCacheService.save(reservationKey, {
      ...reservation,
      ...data,
      status: transition.nextState, // UPDATE_VALIDATED,
    } satisfies Partial<ReservationState>);

    const responseMsg = systemMessages.getConfirmationMsg(data, mode);
    return humanizerAgent(responseMsg);
  } catch {
    return humanizerAgent(
      "Ocurrió un problema inesperado. ¿Podemos intentar de nuevo con los datos de la reserva?",
    );
  }
}
