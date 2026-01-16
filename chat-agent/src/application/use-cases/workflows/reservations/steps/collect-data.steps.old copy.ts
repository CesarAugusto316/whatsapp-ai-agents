import {
  ReservationMode,
  systemMessages,
} from "@/domain/restaurant/reservations/prompts/system-messages";
import {
  CustomerActions,
  FlowOptions,
  FMStatus,
  InputIntent,
  ReservationState,
} from "@/domain/restaurant/reservations/reservation.types";
import { mergeReservationData } from "../../../sagas/reservations/helpers/merge-state";
import cacheAdapter from "@/infraestructure/adapters/cache.adapter";
import { logger } from "@/infraestructure/logging/logger";
import { isWithinBusinessHours } from "@/domain/restaurant/reservations/is-within-business-hours";
import {
  formatSchedule,
  localDateTimeToUTC,
} from "@/domain/utilities/datetime-formatting/datetime-converters";
import { isWithinHolydayRange } from "@/domain/restaurant/reservations/check-next-holyday";
import cmsClient from "@/infraestructure/http/cms/cms.client";
import { renderMsgNotAvailable } from "@/domain/restaurant/reservations/render-msg-not-available";
import { resolveNextState } from "@/application/patterns/FSM-workflow/resolve-next-state";
import { intentClassifierAgent as classifierAgent } from "@/application/agents/restaurant/reservation/intent-classifier-agent";
import { humanizerAgent } from "@/application/agents/restaurant/reservation/humanizer-agent";
import { validatorAgent } from "@/application/agents/restaurant/reservation/validator-agent";
import {
  SagaBag,
  SagaOrchestrator,
} from "@/application/patterns/saga-orchestrator/saga-orchestrator";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import { ReservationSchema } from "@/domain/restaurant/reservations/schemas";

export const ATTEMPTS = 4;

/**
 * Defines all possible step names in the WhatsApp saga workflow.
 * Each step represents a distinct operation in the message processing flow.
 */
type CollectDataStepName =
  | "early_conditions" // Mark message as seen in WhatsApp
  | "collect_and_validate" // Show typing indicator to user
  | "check_availability"; // Execute reservation business logic

/**
 * The result structure for WhatsApp saga steps.
 * Extends the base SagaBag to include text content that will be sent to the user.
 */
interface CollectDataSagaResults extends SagaBag {
  result?: string; // The formatted text content to be sent via WhatsApp
  continue: boolean;
  data?: ReservationSchema;
}

/**
 * Generic type definitions for the WhatsApp saga workflow.
 * Provides type safety for context, results, and step keys throughout the saga.
 *
 * @template C - Context type (defaults to AppContext)
 * @template R - Result type (defaults to WhatsappSagaResults)
 * @template K - Step key type (defaults to WhatappStepName)
 */
export type DataCollectorSaga<
  C = RestaurantCtx,
  R = CollectDataSagaResults,
  K = CollectDataStepName,
> = {
  Ctx: C; // Execution context containing session and customer info
  Result: R; // Result type for saga steps
  StepKey: K; // Step identifier type
};

/**
 *
 * @description
 * @returns
 */
export async function collecDataSteps(
  ctx: RestaurantCtx,
  fmStatus: FMStatus,
  mode: ReservationMode,
) {
  //
  const {
    customerMessage,
    customer,
    RESERVATION_STATE,
    business,
    reservationKey,
  } = ctx;
  const reservation = RESERVATION_STATE as ReservationState;
  const previousState = mergeReservationData(reservation, {
    customerName: customer?.name || "",
  });

  const dataCollectorSaga = new SagaOrchestrator<
    DataCollectorSaga["Ctx"],
    DataCollectorSaga["Result"],
    DataCollectorSaga["StepKey"]
  >({
    ctx,
    dbosConfig: { workflowName: `reservation:${fmStatus}` },
  })
    .addStep({
      config: { execute: { name: "early_conditions" } },
      execute: ({ durableStep }) => {
        return durableStep(async () => {
          // OPTION: 1. SALIR
          if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
            await cacheAdapter.delete(reservationKey);
            const responseMsg = systemMessages.getExitMsg();
            logger.info("Customer asked a question", {
              customerAction: CustomerActions.EXIT,
              customerMessage,
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
            await classifierAgent.inputIntent(customerMessage);

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
    })
    .addStep({
      config: { execute: { name: "collect_and_validate" } },
      execute: async ({ durableStep, getStepResult }) => {
        const previous = getStepResult("execute:early_conditions");
        if (!previous?.continue) return { continue: false };

        return durableStep(async () => {
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
          return { data, continue: true };
        });
      },
    })
    .addStep({
      config: { execute: { name: "check_availability" } },
      execute: async ({ getStepResult, durableStep }) => {
        const previous = getStepResult("execute:collect_and_validate");
        if (!previous?.continue) return { continue: false };

        return durableStep(async () => {
          if (previous.continue && previous.data) {
            const data = previous.data;
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
            const transition = resolveNextState(fmStatus);
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
              currentStatus: reservation.status,
              nextStatus: transition.nextState,
              customerMessage,
            });
            const responseMsg = systemMessages.getConfirmationMsg(
              data,
              timezone,
              mode,
            );

            // ✨ SEND SUCCESS MESSAGE
            const result = await humanizerAgent(responseMsg);
            return { result, continue: false };
          }

          return { continue: true };
        });
      },
    });

  const { lastStepResult } = await dataCollectorSaga.start();
  if (lastStepResult?.execute) {
    return lastStepResult.execute.result;
  }
  if (lastStepResult?.compensate) {
    return lastStepResult.compensate.result;
  }
  return "Ocurrió un error, intenta más tarde";
}
