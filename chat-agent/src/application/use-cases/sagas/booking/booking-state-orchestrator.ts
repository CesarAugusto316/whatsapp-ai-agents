import { FMStatus, InputIntent } from "@/domain/restaurant/booking";
import { BookingResult, reservationSaga } from "./booking-saga";
import type { RestaurantCtx } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { conversationalWorkflow, initialOptionsWorkflow } from "./workflows";
import type { StartedFuncSagaResult, ValidateFuncSagaResult } from "./steps";
import { formatSagaOutput } from "./helpers/format-saga-output";

const MAX_WORDS = 60;

const statusSagaMap: Partial<
  Record<FMStatus, StartedFuncSagaResult | ValidateFuncSagaResult>
> = {
  MAKE_STARTED: reservationSaga.makeStarted,
  MAKE_VALIDATED: reservationSaga.makeValidated,

  UPDATE_STARTED: reservationSaga.updateStarted,
  UPDATE_VALIDATED: reservationSaga.updateValidated,

  CANCEL_VALIDATED: reservationSaga.cancelValidated,
};

/**
 *
 * @param ctx
 * @returns
 */
export const bookingStateOrchestrator = async (
  ctx: RestaurantCtx,
): Promise<BookingResult> => {
  //
  const status = ctx.bookingState?.status;
  const business = ctx.business;
  const words = ctx.customerMessage.split(" ");

  if (words.length > MAX_WORDS) {
    return formatSagaOutput(
      `Por favor resume tu consulta en máximo ${MAX_WORDS} palabras. 😊`,
      "MAX_WORDS_REACHED",
    );
  }
  if (!business.general.isActive) {
    return formatSagaOutput(
      "El negocio está fuera de servicio, por favor inténtalo más tarde.",
      "OUT_OF_SERVICE",
    );
  }
  if (status) {
    // ============================================
    // 2.DETERMINISTIC SAGA ORCHESTRATOR
    // For every workflow option there is a FSM transition
    // ============================================
    const sagaOrchestrator = statusSagaMap[status];
    if (!sagaOrchestrator) {
      throw new Error(`No saga found for status ${status}`);
    }
    const { lastStepResult, bag } = await sagaOrchestrator(ctx);
    const result =
      lastStepResult?.execute?.result ||
      lastStepResult?.compensate?.result ||
      "";
    if (result && result !== InputIntent.INFORMATION_REQUEST) {
      await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, result);
      return { bag, lastStepResult };
    }
  }

  // ============================================
  // 1. POMDP (heuristic-light-pragmatic) entry point
  // ============================================
  return conversationalWorkflow(ctx);
};
