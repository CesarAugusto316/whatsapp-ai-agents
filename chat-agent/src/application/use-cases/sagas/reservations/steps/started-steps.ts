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
  ReservationState,
} from "@/domain/restaurant/reservations";
import { cacheAdapter } from "@/infraestructure/adapters";
import { logger } from "@/infraestructure/logging";
import { formatAvailability, formatSchedule, toUTC } from "@/domain/utilities";
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
  execute: async ({ ctx }) => {
    const { customerMessage, RESERVATION_STATE, reservationKey } = ctx;
    const reservation = RESERVATION_STATE as ReservationState;

    if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
      await cacheAdapter.delete(reservationKey);
      const responseMsg = systemMessages.getExitMsg();
      logger.info("Customer asked a question", {
        customerAction: CustomerActions.EXIT,
      });
      const res = await humanizerAgent(responseMsg);
      return {
        result: res.trim(),
        continue: false,
        metadata: {
          description: "CUSTOMER_EXITED_FLOW",
          internal: CustomerActions.EXIT,
        },
      };
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

      return {
        result: res.trim(),
        continue: false,
        metadata: {
          description: "MAX_ATTEMPTS_REACHED",
          internal: reservation.attempts,
        },
      };
    }
    // OPTION: 3. CLASSIFY INPUT
    const inputIntent =
      await intentClassifierAgent.inputIntent(customerMessage);

    if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
      logger.info("Customer asked a question", {
        inputIntent,
      });
      return {
        result: InputIntent.CUSTOMER_QUESTION,
        continue: false,
        metadata: {
          description: "INPUT_CLASSIFICATION_RESULT",
          internal: InputIntent.CUSTOMER_QUESTION,
        },
      };
    }
    return {
      continue: true,
      metadata: {
        description: "NO_CONDITION_MATCH",
        internal: undefined,
      },
    };
  },
});

const collectAndValidate = (): StartedFuncSagaStep => ({
  config: { execute: { name: "collect_and_validate", ...stepConfig } },
  execute: async ({ ctx }) => {
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

    const agentResult = await validatorAgent.parseData(
      business,
      customerMessage,
      previousState,
    );

    // DATA VALIDATION
    if (!agentResult) {
      logger.info("Failed to parse customer data", {
        customerMessage,
      });
      const result = await humanizerAgent(
        "Lo siento no pude comprender tus datos, podrias escribirlos de nuevo con mas claridad ?",
      );
      return {
        result,
        continue: false,
        metadata: {
          description: "NO_PARSING_RESULT",
          internal: agentResult,
        },
      };
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

      const result = await validatorAgent.collectMissingData(business, errors);
      return {
        result,
        continue: false,
        metadata: {
          description: "COLLECTING_MISSING_DATA",
          internal: errors,
        },
      };
    }
    return {
      data,
      continue: true,
      metadata: {
        description: "COLLECTED_DATA",
      },
    }; // SUCCESS ✅
  },
});

const checkAvailability = (mode: ReservationMode): StartedFuncSagaStep => ({
  config: { execute: { name: "check_availability", ...stepConfig } },
  execute: async ({ ctx, getStepResult }) => {
    //
    const previous = getStepResult("execute:collect_and_validate");
    const { customerMessage, RESERVATION_STATE, reservationKey, business } =
      ctx;
    const reservation = RESERVATION_STATE as ReservationState;

    // if collect_and_validate OK
    if (previous?.continue && previous?.data) {
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

        const availability = await cmsClient.suggestSlots({
          "where[business][equals]": business.id,
        });
        const titleMsg =
          "Estas fuera del horario de atención del negocio, te recomendamos reservar en";
        const msg = formatAvailability(
          availability.slotsByTimeRange ?? [],
          availability.maxCapacityPerHour,
          business.general.timezone,
        );
        return {
          result: `${titleMsg} ${msg}`, // suggest available slots
          continue: false,
          metadata: {
            description: "IS_OUT_OF_BUSINESS_HOURS",
            internal: isWithinSchedule,
          },
        };
      }
      const startDateTime = toUTC(start, timezone);
      const endDateTime = toUTC(end, timezone);

      const { isWithinRange, message } = isWithinHolydayRange(
        business,
        startDateTime,
      );

      /**
       * @todo Recommend suggested available slots
       */
      if (isWithinRange) {
        logger.info("Reservation within holyday", {
          isWithinRange,
          customerMessage,
        });
        await cacheAdapter.save(reservationKey, {
          ...reservation,
          ...data,
        } satisfies Partial<ReservationState>);

        return {
          result: message, // suggest available slots
          continue: false,
          metadata: {
            description: "IS_WITHIN_HOLIDAY",
            internal: isWithinRange,
          },
        };
      }
      const availability = await cmsClient.checkAvailability({
        "where[business][equals]": reservation.businessId,
        "where[startDateTime][equals]": startDateTime,
        "where[endDateTime][equals]": endDateTime,
        "where[numberOfPeople][equals]": data.numberOfPeople,
      });

      if (availability && !availability?.isSlotAvailable) {
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

        // suggest available slots
        const titleMsg =
          "La fecha que has seleccionado no está disponible. Te recomendamos reservar en";
        const msg = formatAvailability(
          availability.slotsByTimeRange ?? [],
          availability.maxCapacityPerHour,
          business.general.timezone,
        );

        return {
          result: `${titleMsg}: \n${msg}`, // suggest available slots
          continue: false,
          metadata: {
            description: "RESERVATION_NOT_AVAILABLE",
            internal: availability,
          },
        };
      }

      // FINAL: ✅ INPUT DATA VALIDATED
      const transition = resolveNextState(reservation.status);
      await cacheAdapter.save(reservationKey, {
        ...reservation,
        ...data,
        status: transition.nextState, // UPDATE_VALIDATED,
      } satisfies Partial<ReservationState>);

      /** @todo implement semantic memory */

      // await semanticMemory.upsert({
      //   chatId: reservationKey,
      //   type: "reservation_state",
      //   payload: {
      //     status: transition.nextState,
      //     datetime: data.datetime,
      //     people: data.numberOfPeople
      //   }
      // });

      logger.info("✅ Reservation data validated", {
        reservation: {
          ...reservation,
          ...data,
        },
      });
      const responseMsg = systemMessages.getConfirmationMsg(
        data,
        mode,
        business.general.timezone,
      );

      // ✨ SEND SUCCESS MESSAGE
      const result = await humanizerAgent(responseMsg);
      return {
        result,
        data,
        shouldTransition: true,
        continue: false,
        metadata: {
          description: "DATA_VALIDATED",
          internal: transition.nextState,
        },
      };
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
export const withTransitionStep = (
  step: StartedFuncSagaStep,
): StartedFuncSagaStep => ({
  config: step.config,
  execute: async (args) => {
    //
    const result = await step.execute(args);
    // await resolveNextState(result?.status)
    return { continue: false, ...result };
  },
  compensate: async (args) => {
    if (step.compensate) {
      return await step?.compensate(args);
    }
    return { continue: true };
  },
});

// withTransitionStep(earlyConditions("create"));
