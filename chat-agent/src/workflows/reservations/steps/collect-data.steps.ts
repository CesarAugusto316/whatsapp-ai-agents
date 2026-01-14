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
 * @description Reestructuración con 3 DBOS.runStep agrupados coherentemente
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
    // ============================================
    // PASO 1: Manejo de condiciones tempranas (EXIT y máximo intentos)
    // ============================================
    const earlyConditionsResult = await DBOS.runStep(
      async () => {
        // OPTION: 1. SALIR
        if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
          await reservationCacheService.delete(reservationKey);
          logger.info("Customer asked a question", {
            customerAction: CustomerActions.EXIT,
          });
          return { type: "exit" as const };
        }

        // OPTION: 2. REINICIAR FOR MAXIMUM ATTEMPTS REACHED
        if ((reservation?.attempts ?? 0) >= ATTEMPTS) {
          await reservationCacheService.delete(reservationKey);
          return { type: "retry" as const };
        }

        return { type: "continue" as const };
      },
      { name: "earlyConditions" },
    );

    // Procesar resultados tempranos fuera del paso durable
    if (earlyConditionsResult.type === "exit") {
      const responseMsg = systemMessages.getExitMsg();
      return humanizerAgent(responseMsg);
    }

    if (earlyConditionsResult.type === "retry") {
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

    // ============================================
    // PASO 2: Clasificación de intención, parseo y validación básica
    // ============================================
    const parsingResult = await DBOS.runStep(
      async () => {
        // OPTION: 3. CLASSIFY INPUT
        const inputIntent = await inputIntentClassifier(customerMessage);

        if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
          logger.info("Customer asked a question", {
            inputIntent,
            customerMessage,
          });
          return { type: "customer_question" as const };
        }

        // OPTION: 4. PARSE USER INPUT
        const result = await validatorAgent.parse(
          business,
          customerMessage,
          previousState,
        );

        // DATA VALIDATION
        if (!result) {
          logger.info("Failed to parse customer data", {
            customerMessage,
            previousState,
          });
          return { type: "parse_failed" as const };
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

          // Guardamos el estado parcial en caché
          await reservationCacheService.save(reservationKey, {
            ...reservation,
            ...mergedData,
          } satisfies Partial<ReservationState>);

          return { type: "validation_failed" as const, errors };
        }

        return { type: "data_valid" as const, data };
      },
      { name: "parseAndValidate" },
    );

    // Procesar resultados del parseo
    if (parsingResult.type === "customer_question") {
      return InputIntent.CUSTOMER_QUESTION;
    }

    if (parsingResult.type === "parse_failed") {
      return humanizerAgent(
        "Lo siento no pude comprender tus datos, podrías escribirlos de nuevo con más claridad?",
      );
    }

    if (parsingResult.type === "validation_failed") {
      return validatorAgent.humanizeErrors(business, parsingResult.errors);
    }

    // ============================================
    // PASO 3: Validaciones de negocio y operaciones finales
    // ============================================
    const businessValidationResult = await DBOS.runStep(
      async () => {
        const { data } = parsingResult;
        const timezone = business.general.timezone;
        const { start, end } = data?.datetime;

        // Validar horario de atención
        const isWithinSchedule = {
          start: isWithinBusinessHours(business.schedule, timezone, start),
          end: isWithinBusinessHours(business.schedule, timezone, end),
        };

        if (!isWithinSchedule.start || !isWithinSchedule.end) {
          logger.info("Reservation out of business hours", {
            customerMessage,
            isWithinSchedule,
          });

          await reservationCacheService.save(reservationKey, {
            ...reservation,
            ...data,
          } satisfies Partial<ReservationState>);

          const schedule = business.schedule;
          const SCHEDULE_BLOCK = formatSchedule(schedule, timezone);
          return {
            type: "out_of_hours" as const,
            scheduleBlock: SCHEDULE_BLOCK,
          };
        }

        // Convertir a UTC y validar feriados
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

          await reservationCacheService.save(reservationKey, {
            ...reservation,
            ...data,
          } satisfies Partial<ReservationState>);

          return { type: "holiday" as const, holidayMsg };
        }

        // Check disponibilidad (con retries implícitos si DBOS lo configura)
        const availability = await cmsService.checkAvailability({
          "where[business][equals]": reservation.businessId,
          "where[startDateTime][equals]": startDateTime,
          "where[endDateTime][equals]": endDateTime,
          "where[numberOfPeople][equals]": data.numberOfPeople,
        });

        if (availability && !availability?.isFullyAvailable) {
          logger.info("Reservation not available", {
            availability,
            customerMessage,
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
          return { type: "not_available" as const, msg };
        }

        // FINAL: ✅ INPUT DATA VALIDATED
        const transition = resolveNextState(fmStatus);
        await reservationCacheService.save(reservationKey, {
          ...reservation,
          ...data,
          status: transition.nextState,
        } satisfies Partial<ReservationState>);

        logger.info("✅ Reservation data validated", {
          reservation: {
            ...reservation,
            ...data,
          },
          currentStatus: reservation.status,
          nextStatus: transition.nextState,
          customerMessage,
        });

        const responseMsg = systemMessages.getConfirmationMsg(
          data,
          timezone,
          mode,
        );
        return { type: "success" as const, message: responseMsg };
      },
      {
        name: "businessValidation",
        // Configurar retries solo para checkAvailability si es necesario
        // DBOS manejará los retries dentro del paso si la función falla
      },
    );

    // Procesar resultados finales
    switch (businessValidationResult.type) {
      case "out_of_hours":
        return humanizerAgent(`
          😔 Lo sentimos, el día y hora seleccionados no están dentro del horario
          de atención del negocio. Por favor, selecciona otro día y hora.

          ==============================
          HORARIO DE ATENCIÓN
          ==============================
          ${businessValidationResult.scheduleBlock}
        `);

      case "holiday":
        return businessValidationResult.holidayMsg;

      case "not_available":
        return humanizerAgent(businessValidationResult.msg);

      case "success":
        return humanizerAgent(businessValidationResult.message);
    }
  } catch (error) {
    logger.error(
      "❌ Error collecting-validating reservation data",
      error as Error,
    );
    throw error;
  }
}
