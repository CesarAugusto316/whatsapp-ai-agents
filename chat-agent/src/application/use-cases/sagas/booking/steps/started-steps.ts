import {
  CustomerSignals,
  BookingOptions,
  isWithinBusinessHours,
  isWithinHolydayRange,
  BookingState,
} from "@/domain/booking";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { logger } from "@/infraestructure/logging";
import { formatAvailability, toUTC } from "@/domain/utilities";
import { cmsAdapter } from "@/infraestructure/adapters/cms";
import { humanizerAgent, validatorAgent } from "@/application/agents";
import {
  ISagaStep,
  SagaBag,
  SagaResult,
  stepConfig,
} from "@/application/patterns";
import { DomainCtx } from "@/domain/booking";
import {
  BookingSchema,
  InputIntent,
} from "@/domain/booking/input-parser/booking-schemas";
import {
  bookingStateManager,
  getBookingExitMsg,
} from "@/application/services/state-managers";
import { classifyInput } from "@/domain/booking/input-parser";
import { OperationMode } from "@/domain";

export const ATTEMPTS = 4;

export type StartedSteps =
  | "early_conditions" // Mark message as seen in WhatsApp
  | "collect_and_validate" // Show typing indicator to user
  | "check_availability";

export interface StartedSagaResult extends SagaBag {
  data?: BookingSchema;
}

export type StartedFuncSagaResult = (
  ctx: DomainCtx,
) => Promise<SagaResult<StartedSagaResult, StartedSteps>>;

type StartedFuncSagaStep = ISagaStep<
  DomainCtx,
  StartedSagaResult,
  StartedSteps
>;

const earlyConditions = (mode: OperationMode): StartedFuncSagaStep => ({
  config: { execute: { name: "early_conditions", ...stepConfig } },
  execute: async ({ ctx }) => {
    const { customerMessage, bookingState, bookingKey, business } = ctx;
    const reservation = bookingState as BookingState;

    // TODO: REMOVE, deberiamos usar el intentClassfier and regex
    if (customerMessage?.toUpperCase() === CustomerSignals.EXIT) {
      const responseMsg = getBookingExitMsg(business.general.businessType);
      await cacheAdapter.delete(bookingKey);
      return {
        result: responseMsg,
        continue: false,
        metadata: {
          description: "CUSTOMER_EXITED_FLOW",
          internal: CustomerSignals.EXIT,
        },
      };
    }
    // TODO: ESTO DEBE IR EN POLICY ENGINE
    if ((reservation?.attempts ?? 0) >= ATTEMPTS) {
      await cacheAdapter.delete(bookingKey);
      const action =
        mode === "create"
          ? BookingOptions.MAKE_BOOKING
          : BookingOptions.UPDATE_BOOKING;
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
    const inputIntent = classifyInput(customerMessage);

    if (inputIntent === InputIntent.INFORMATION_REQUEST) {
      logger.info("Customer asked a question", {
        inputIntent,
      });
      return {
        result: InputIntent.INFORMATION_REQUEST,
        continue: false,
        metadata: {
          description: "INPUT_CLASSIFICATION_RESULT",
          internal: InputIntent.INFORMATION_REQUEST,
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
    const { customerMessage, bookingState, bookingKey, business, customer } =
      ctx;
    const reservation = bookingState as BookingState;
    const previousState = bookingStateManager.mergeState(reservation, {
      customerName: customer?.name || "",
    });

    const dataSchema = validatorAgent.parseData(customerMessage, previousState);

    // DATA VALIDATION
    if (!dataSchema) {
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
          internal: dataSchema,
        },
      };
    }
    const { parsedData, mergedData } = dataSchema;
    const { success, data, errors } = parsedData;

    // OPTION: 5. ASK FOR MISSING DATA
    if (!success) {
      logger.info("Zod failed to parse customer data", {
        customerMessage,
        previousState,
        parsedData,
      });
      await cacheAdapter.save(bookingKey, {
        ...reservation,
        ...mergedData,
      } satisfies Partial<BookingState>);

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

const checkAvailability = (): StartedFuncSagaStep => ({
  config: { execute: { name: "check_availability", ...stepConfig } },
  execute: async ({ ctx, getStepResult }) => {
    //
    const previous = getStepResult("execute:collect_and_validate");
    const { customerMessage, bookingState, bookingKey, business } = ctx;
    const reservation = bookingState as BookingState;
    const timeZone = business.general.timezone;

    // if collect_and_validate OK
    if (previous?.continue && previous?.data) {
      const data = previous.data!;
      const { start, end } = data?.datetime;

      const isWithinSchedule = {
        start: isWithinBusinessHours(business.schedule, timeZone, start),
        end: isWithinBusinessHours(business.schedule, timeZone, end),
      };

      if (!isWithinSchedule.start || !isWithinSchedule.end) {
        logger.info("Reservation out of business hours", {
          customerMessage,
          isWithinSchedule,
        });
        await cacheAdapter.save(bookingKey, {
          ...reservation,
          ...data,
        } satisfies Partial<BookingState>);

        const availability = await cmsAdapter.suggestSlots({
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
      const startDateTime = toUTC(start, timeZone);
      const endDateTime = toUTC(end, timeZone);

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
        await cacheAdapter.save(bookingKey, {
          ...reservation,
          ...data,
        } satisfies Partial<BookingState>);

        return {
          result: message, // suggest available slots
          continue: false,
          metadata: {
            description: "IS_WITHIN_HOLIDAY",
            internal: isWithinRange,
          },
        };
      }
      const availability = await cmsAdapter.checkAvailability({
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
        await cacheAdapter.save(bookingKey, {
          ...reservation,
          ...data,
          attempts: retries,
        } satisfies Partial<BookingState>);

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
      const domain = business.general.businessType;
      const transition = bookingStateManager.nextState(reservation.status, {
        data,
        timeZone,
        domain,
      });
      await cacheAdapter.save(bookingKey, {
        ...reservation,
        ...data,
        status: transition.nextState, // *_VALIDATED,
      } satisfies Partial<BookingState>);

      logger.info("✅ Reservation data validated", {
        reservation: {
          ...reservation,
          ...data,
        },
      });

      // ✨ SEND SUCCESS MESSAGE
      // const result = await humanizerAgent(transition.message);
      return {
        result: transition.message,
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
