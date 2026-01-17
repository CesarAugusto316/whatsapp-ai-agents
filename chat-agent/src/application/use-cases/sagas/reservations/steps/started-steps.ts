import {
  ReservationMode,
  systemMessages,
} from "@/domain/restaurant/reservations/prompts";
import {
  CustomerActions,
  FlowOptions,
  InputIntent,
  isWithinBusinessHours,
  isWithinHolydayRange,
  renderMsgNotAvailable,
  ReservationState,
} from "@/domain/restaurant/reservations";
import { cacheAdapter } from "@/infraestructure/adapters";
import { logger } from "@/infraestructure/logging/logger";
import { formatSchedule, localDateTimeToUTC } from "@/domain/utilities";
import { cmsClient } from "@/infraestructure/http/cms";
import { resolveNextState } from "@/application/patterns";
import {
  humanizerAgent,
  intentClassifierAgent,
  validatorAgent,
} from "@/application/agents/restaurant";
import {
  ISagaStep,
  SagaBag,
  SagaResult,
  stepConfig,
} from "@/application/patterns";
import { RestaurantCtx } from "@/domain/restaurant";
import { ReservationSchema } from "@/domain/restaurant/reservations/schemas";
import { mergeReservationData } from "../helpers/merge-state";

export const ATTEMPTS = 4;

export type StartedSteps =
  | "early_conditions" // Mark message as seen in WhatsApp
  | "collect_and_validate" // Show typing indicator to user
  | "check_availability";

export interface StartedSagaResult extends SagaBag {
  result?: string; // The formatted text content to be sent via WhatsApp
  data?: ReservationSchema;
}

export type StartedFuncSagaResult = (
  ctx: RestaurantCtx,
) => Promise<SagaResult<StartedSagaResult, StartedSteps>>;

type StartedFuncSagaStep = ISagaStep<
  RestaurantCtx,
  StartedSagaResult,
  StartedSteps
>;

const earlyConditions = (mode: ReservationMode): StartedFuncSagaStep => ({
  config: { execute: { name: "early_conditions", ...stepConfig } },
  execute: ({ ctx, retryStep }) => {
    const { customerMessage, RESERVATION_STATE, reservationKey } = ctx;
    const reservation = RESERVATION_STATE as ReservationState;

    return retryStep(async () => {
      // OPTION: 1. SALIR
      if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
        await cacheAdapter.delete(reservationKey);
        const responseMsg = systemMessages.getExitMsg();
        logger.info("Customer asked a question", {
          customerAction: CustomerActions.EXIT,
        });
        const res = await humanizerAgent(responseMsg);
        return { result: res.trim(), continue: false };
      }
      // OPTION: 2. REINICIAR FOR MAXIMUM ATTEMPTS REACHED
      if ((reservation?.attempts ?? 0) >= ATTEMPTS) {
        await cacheAdapter.delete(reservationKey);
        const action =
          mode === "create"
            ? FlowOptions.MAKE_RESERVATION
            : FlowOptions.UPDATE_RESERVATION;
        const verb = mode === "create" ? "iniciar" : "actualizar";
        const res = await humanizerAgent(`
          Has llegado al límite de *intentos fallidos* al checkear disponibilidad.

          Empecemos de nuevo desde cero.
          Escribe *${action}* para ${verb} otro proceso de reserva.
        `);

        return { result: res.trim(), continue: false };
      }
      // OPTION: 3. CLASSIFY INPUT
      const inputIntent =
        await intentClassifierAgent.inputIntent(customerMessage);

      if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
        logger.info("Customer asked a question", {
          inputIntent,
          customerMessage,
        });
        return { result: InputIntent.CUSTOMER_QUESTION, continue: false };
      }

      return { continue: true };
    });
  },
});

const collectAndValidate = (): StartedFuncSagaStep => ({
  config: { execute: { name: "collect_and_validate", ...stepConfig } },
  execute: async ({ ctx, retryStep }) => {
    const {
      customerMessage,
      RESERVATION_STATE,
      reservationKey,
      business,
      customer,
    } = ctx;
    const reservation = RESERVATION_STATE as ReservationState;
    const previousState = mergeReservationData(reservation, {
      customerName: customer?.name || "",
    });

    return retryStep(async () => {
      // OPTION: 4. PARSE USER INPUT
      const agentResult = await validatorAgent.parseData(
        business,
        customerMessage,
        previousState,
      );

      // DATA VALIDATION
      if (!agentResult) {
        logger.info("Failed to parse customer data", {
          customerMessage,
          previousState,
        });
        const result = await humanizerAgent(
          "Lo siento no pude comprender tus datos, podrias escribirlos de nuevo con mas claridad ?",
        );
        return { result, continue: false };
      }
      const { parsedData, mergedData } = agentResult;
      const { success, data, errors } = parsedData;

      // OPTION: 5. ASK FOR MISSING DATA
      if (!success) {
        logger.info("Zod failed to parse customer data", {
          customerMessage,
          previousState,
          parsedData,
        });
        await cacheAdapter.save(reservationKey, {
          ...reservation,
          ...mergedData,
        } satisfies Partial<ReservationState>);

        const result = await validatorAgent.collectMissingData(
          business,
          errors,
        );
        return { result, continue: false };
      }
      return { data, continue: true }; // SUCCESS ✅
    });
  },
});

const checkAvailability = (mode: ReservationMode): StartedFuncSagaStep => ({
  config: { execute: { name: "check_availability", ...stepConfig } },
  execute: async ({ ctx, getStepResult, retryStep }) => {
    //
    const previous = getStepResult("execute:collect_and_validate");
    const { customerMessage, RESERVATION_STATE, reservationKey, business } =
      ctx;
    const reservation = RESERVATION_STATE as ReservationState;

    if (previous?.continue && previous?.data) {
      return retryStep(async () => {
        const timezone = business.general.timezone;
        const data = previous.data!;
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
          await cacheAdapter.save(reservationKey, {
            ...reservation,
            ...data,
          } satisfies Partial<ReservationState>);

          const schedule = business.schedule;
          const SCHEDULE_BLOCK = formatSchedule(schedule, timezone);
          const result = await humanizerAgent(`
            😔 Lo sentimos, el día y hora seleccionados no están dentro del horario
            de atención del negocio. Por favor, selecciona otro día y hora.

            ==============================
            HORARIO DE ATENCION
            ==============================
            ${SCHEDULE_BLOCK}
          `);
          return { result, continue: false };
        }
        const startDateTime = localDateTimeToUTC(start, timezone);
        const endDateTime = localDateTimeToUTC(end, timezone);

        const { isWithinRange, message } = isWithinHolydayRange(
          business,
          startDateTime,
        );
        if (isWithinRange) {
          logger.info("Reservation within business hours", {
            isWithinRange,
            customerMessage,
          });
          await cacheAdapter.save(reservationKey, {
            ...reservation,
            ...data,
          } satisfies Partial<ReservationState>);

          return { result: message, continue: false };
        }
        const availability = await cmsClient.checkAvailability({
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
          await cacheAdapter.save(reservationKey, {
            ...reservation,
            ...data,
            attempts: retries,
          } satisfies Partial<ReservationState>);

          const msg = renderMsgNotAvailable({
            availability,
            business,
            data,
          });
          const result = await humanizerAgent(msg);
          return { result, continue: false };
        }

        // FINAL: ✅ INPUT DATA VALIDATED
        const transition = resolveNextState(reservation.status);
        await cacheAdapter.save(reservationKey, {
          ...reservation,
          ...data,
          status: transition.nextState, // UPDATE_VALIDATED,
        } satisfies Partial<ReservationState>);

        logger.info("✅ Reservation data validated", {
          reservation: {
            ...reservation,
            ...data,
          },
        });
        const responseMsg = systemMessages.getConfirmationMsg(
          data,
          timezone,
          mode,
        );

        // ✨ SEND SUCCESS MESSAGE
        const result = await humanizerAgent(responseMsg);
        return { result, data, shouldTransition: true, continue: false };
      });
    }

    return { continue: true };
  },
});

export const startedSteps = {
  earlyConditions,
  collectAndValidate,
  checkAvailability,
};

// -----------------------------------------------------------
// DECORATOR PATTERN FOR FSM TRANSISIONS
// -----------------------------------------------------------
const step = (): StartedFuncSagaStep => ({
  config: { execute: { name: "check_availability", ...stepConfig } },
  execute: async ({ ctx, getStepResult, retryStep }) => {
    //
    return { continue: true };
  },
});

const withTransitionStep = (
  step: StartedFuncSagaStep,
): StartedFuncSagaStep => ({
  config: step.config,
  execute: async (args) => {
    //
    const retult = await step.execute(args);
    // await resolveNextState(result?.status)
    return { continue: false };
  },
  compensate: async (args) => {
    if (step.compensate) {
      return await step?.compensate(args);
    }
    return { continue: true };
  },
});
