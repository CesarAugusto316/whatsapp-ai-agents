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
import { isWithinHolydayRange } from "../helpers/check-next-holyday";
import { renderMsgNotAvailable } from "../helpers/render-msg-not-available";
import { logger } from "@/middlewares/logger-middleware";
import { DBOS } from "@dbos-inc/dbos-sdk";

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
export async function collecDataSteps({
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
      await DBOS.runStep(() => reservationCacheService.delete(reservationKey), {
        name: "reservationCacheService.delete",
      });
      const responseMsg = systemMessages.getExitMsg();
      logger.info("Customer asked a question", {
        customerAction: CustomerActions.EXIT,
        customerMessage,
      });

      return DBOS.runStep(() => humanizerAgent(responseMsg), {
        name: "humanizerAgent",
      });
    }

    // OPTION: 2. REINICIAR FOR MAXIMUM ATTEMPTS REACHED
    if ((reservation?.attempts ?? 0) >= ATTEMPTS) {
      await DBOS.runStep(() => reservationCacheService.delete(reservationKey), {
        name: "reservationCacheService.delete",
      });
      const action =
        mode === "create"
          ? FlowOptions.MAKE_RESERVATION
          : FlowOptions.UPDATE_RESERVATION;
      const verb = mode === "create" ? "iniciar" : "actualizar";

      return DBOS.runStep(
        () =>
          humanizerAgent(`
            Has llegado al límite de *intentos fallidos* al checkear disponibilidad.

            Empecemos de nuevo desde cero.
            Escribe *${action}* para ${verb} otro proceso de reserva.
      `),
        {
          name: "humanizerAgent",
        },
      );
    }

    // OPTION: 3. CLASSIFY INPUT
    const inputIntent = await DBOS.runStep(
      () => inputIntentClassifier(customerMessage),
      { name: "inputIntentClassifier" },
    );

    if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
      logger.info("Customer asked a question", {
        inputIntent,
        customerMessage,
      });
      // This breaks the flow and the fallback AGENT takes control back
      return InputIntent.CUSTOMER_QUESTION;
    }

    // OPTION: 4. PARSE USER INPUT
    const result = await DBOS.runStep(
      () => validatorAgent.parse(business, customerMessage, previousState),
      { name: "validatorAgent.parse" },
    );

    // DATA VALIDATION
    if (!result) {
      logger.info("Failed to parse customer data", {
        customerMessage,
        previousState,
      });

      return DBOS.runStep(
        () =>
          humanizerAgent(
            "Lo siento no pude comprender tus datos, podrias escribirlos de nuevo con mas claridad ?",
          ),
        { name: "humanizerAgent" },
      );
    }
    const { parsedData, mergedData } = result;
    const { success, data, errors } = parsedData;

    // OPTION: 5. ASK FOR MISSING DATA
    if (!success) {
      logger.info("Zod failed to parse customer data", {
        customerMessage,
        previousState,
        parsedData,
      });
      await DBOS.runStep(
        () =>
          reservationCacheService.save(reservationKey, {
            ...reservation,
            ...mergedData,
          } satisfies Partial<ReservationState>),
        { name: "reservationCacheService.save" },
      );

      return DBOS.runStep(
        () => validatorAgent.humanizeErrors(business, errors),
        { name: "validatorAgent.humanizeErrors" },
      );
    }

    const timezone = business.general.timezone;
    const { start, end } = data?.datetime;
    const isWithinSchedule = {
      start: isWithinBusinessHours(business.schedule, timezone, start),
      end: isWithinBusinessHours(business.schedule, timezone, end),
    };

    if (!isWithinSchedule.start || !isWithinSchedule.end) {
      logger.info("Reservation out of business hours", {
        customerMessage,
        isWithinSchedule,
      });
      await DBOS.runStep(
        () =>
          reservationCacheService.save(reservationKey, {
            ...reservation,
            ...data,
          } satisfies Partial<ReservationState>),
        { name: "reservationCacheService.save" },
      );

      const schedule = business.schedule;
      const SCHEDULE_BLOCK = formatSchedule(schedule, timezone);
      return DBOS.runStep(
        () =>
          humanizerAgent(`
            😔 Lo sentimos, el día y hora seleccionados no están dentro del horario
            de atención del negocio. Por favor, selecciona otro día y hora.

            ==============================
            HORARIO DE ATENCION
            ==============================
            ${SCHEDULE_BLOCK}
      `),
        { name: "humanizerAgent" },
      );
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
        customerMessage,
      });
      await DBOS.runStep(
        () =>
          reservationCacheService.save(reservationKey, {
            ...reservation,
            ...data,
          } satisfies Partial<ReservationState>),
        { name: "reservationCacheService.save" },
      );

      return holidayMsg;
    }
    const availability = await DBOS.runStep(
      () =>
        cmsService.checkAvailability({
          "where[business][equals]": reservation.businessId,
          "where[startDateTime][equals]": startDateTime,
          "where[endDateTime][equals]": endDateTime,
          "where[numberOfPeople][equals]": data.numberOfPeople,
        }),
      { name: "cmsService.checkAvailability" },
    );

    if (availability && !availability?.isFullyAvailable) {
      logger.info("Reservation not available", {
        availability,
        customerMessage,
      });
      const retries = (reservation?.attempts || 0) + 1;
      await DBOS.runStep(
        () =>
          reservationCacheService.save(reservationKey, {
            ...reservation,
            ...data,
            attempts: retries,
          } satisfies Partial<ReservationState>),
        { name: "reservationCacheService.save" },
      );

      const msg = renderMsgNotAvailable({
        availability,
        business,
        data,
      });
      return DBOS.runStep(() => humanizerAgent(msg), {
        name: "humanizerAgent",
      });
    }

    // FINAL: ✅ INPUT DATA VALIDATED
    const transition = resolveNextState(fmStatus);
    await DBOS.runStep(
      () =>
        reservationCacheService.save(reservationKey, {
          ...reservation,
          ...data,
          status: transition.nextState, // UPDATE_VALIDATED,
        } satisfies Partial<ReservationState>),
      { name: "reservationCacheService.save" },
    );

    logger.info("✅ Reservation data validated", {
      reservation: {
        ...reservation,
        ...data,
      },
      currentStatus: reservation.status,
      nextStatus: transition.nextState,
      customerMessage,
    });
    const responseMsg = systemMessages.getConfirmationMsg(data, timezone, mode);

    // ✨ SEND SUCCESS MESSAGE
    return DBOS.runStep(() => humanizerAgent(responseMsg), {
      name: "humanizerAgent",
    });
  } catch (error) {
    //
    logger.error(
      "❌ Error collecting-validating reservation data",
      error as Error,
    );
    throw error;
  }
}
