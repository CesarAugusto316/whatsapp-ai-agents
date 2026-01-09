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
import cmsService from "@/services/business.service";
import {
  formatSchedule,
  localDateTimeToUTC,
} from "@/helpers/datetime-converters";
import { isWithinBusinessHours } from "@/helpers/is-within-business-hours";
import { isWithinHolydayRange } from "./check-next-holyday";
import { renderMsgNotAvailable } from "./render-msg-not-available";
import { logger } from "@/middlewares/logger-middleware";

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
      const action =
        mode === "create"
          ? FlowOptions.MAKE_RESERVATION
          : FlowOptions.UPDATE_RESERVATION;
      const verb = mode === "create" ? "iniciar" : "actualizar";
      return humanizerAgent(`
        Has llegado al límite de *intentos fallidos* al checkear disponibilidad.

        Empecemos de nuevo desde cero.
        Escribe *${action}* para ${verb} otro proceso de reserva.
      `);
    }
    const inputIntent = await inputIntentClassifier(customerMessage);

    if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
      logger.info("Customer asked a question", { inputIntent });
      return InputIntent.CUSTOMER_QUESTION;
      // This breaks the flow and the fallback AGENT takes control back
    }

    // ✅ All fields are required here
    const result = await validatorAgent.parse(
      business,
      customerMessage,
      previousState,
    );
    if (!result) {
      logger.info("Failed to parse customer data", {
        customerMessage,
        previousState,
      });
      return humanizerAgent(
        "Lo siento no pude comprender tus datos, podrias escribirlos de nuevo con mas claridad ?",
      );
    }
    const { parsedData, mergedData } = result;
    const { success, data, error } = parsedData;

    if (!success) {
      logger.info("Zod failed to parse customer data", {
        customerMessage,
        previousState,
        success,
        data,
        error,
      });
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

    if (!isWithinSchedule.start || !isWithinSchedule.end) {
      logger.info("Reservation out of business hours", {
        isWithinSchedule,
      });
      await reservationCacheService.save(reservationKey, {
        ...reservation,
        ...data,
      } satisfies Partial<ReservationState>);

      const schedule = business.schedule;
      const SCHEDULE_BLOCK = formatSchedule(schedule, timezone);
      return humanizerAgent(`
        😔 Lo sentimos, el día y hora seleccionados no están dentro del horario
        de atención del negocio. Por favor, selecciona otro día y hora.

        ==============================
        HORARIO DE ATENCION
        ==============================
        ${SCHEDULE_BLOCK}
      `);
    }
    const startDateTime = localDateTimeToUTC(start, timezone);
    const endDateTime = localDateTimeToUTC(end, timezone);

    const { isWithinRange, message: holidayMsg } = isWithinHolydayRange(
      business,
      startDateTime,
    );
    if (isWithinRange) {
      logger.info("Reservation within business hours", {
        isWithinRange,
      });
      await reservationCacheService.save(reservationKey, {
        ...reservation,
        ...data,
      } satisfies Partial<ReservationState>);
      return holidayMsg;
    }
    const availability = await cmsService.checkAvailability({
      "where[business][equals]": reservation.businessId,
      "where[startDateTime][equals]": startDateTime,
      "where[endDateTime][equals]": endDateTime,
      "where[numberOfPeople][equals]": data.numberOfPeople,
    });

    if (availability && !availability?.isFullyAvailable) {
      logger.info("Reservation not available", {
        availability,
      });
      const retries = (reservation?.attempts || 0) + 1;
      await reservationCacheService.save(reservationKey, {
        ...reservation,
        ...data,
        attempts: retries,
      } satisfies Partial<ReservationState>);

      const msg = renderMsgNotAvailable({
        availability,
        business,
        data,
      });
      return humanizerAgent(msg);
    }

    // 2. ✅ INPUT DATA VALIDATED
    const transition = resolveNextState(fmStatus);
    await reservationCacheService.save(reservationKey, {
      ...reservation,
      ...data,
      status: transition.nextState, // UPDATE_VALIDATED,
    } satisfies Partial<ReservationState>);
    logger.info("✅ Reservation data validated", {
      reservation: {
        ...reservation,
        ...data,
      },
      currentStatus: reservation.status,
      nextStatus: transition.nextState,
    });
    const responseMsg = systemMessages.getConfirmationMsg(data, mode);
    return humanizerAgent(responseMsg);
  } catch (error) {
    logger.error("❌ Error validating reservation data", error as Error);
    return humanizerAgent(
      "Ocurrió un problema inesperado. ¿Podemos intentar de nuevo con los datos de la reserva?",
    );
  }
}
