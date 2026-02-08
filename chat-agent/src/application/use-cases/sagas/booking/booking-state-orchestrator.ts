import { FMStatus, InputIntent } from "@/domain/restaurant/booking";
import { BookingResult, reservationSaga } from "./booking-saga";
import { RestaurantCtx } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import {
  conversationalWorkflow,
  initialOptionsWorkflow,
  StartedFuncSagaResult,
  ValidateFuncSagaResult,
} from "./steps";

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

  if (!business.general.isActive) {
    return {
      bag: {},
      lastStepResult: {
        execute: {
          result:
            "El negocio está fuera de servicio, por favor inténtalo más tarde.",
        },
      },
    };
  }
  if (status) {
    // ============================================
    // 1.DETERMINISTIC SAGA ORCHESTRATOR
    // For every workflow option there is a FSM that determines
    // which saga orchestrator to execute and the next status
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

    if (result && result !== InputIntent.CUSTOMER_QUESTION) {
      await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, result);
      return { bag, lastStepResult };
    }
  } else {
    // ============================================
    // 2. MAIN WORKFLOW OPTIONS (DETERMISTIC)
    // ============================================
    const res = await initialOptionsWorkflow(ctx);
    if (res) {
      const { lastStepResult } = res;
      const result =
        lastStepResult?.execute?.result ||
        lastStepResult?.compensate?.result ||
        "";
      await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, result);
      return res;
    }
  }

  // ============================================
  // 1. POMDP (heuristic-light-pragmatic) entry point
  // ============================================
  /**
   *
   * @see {InputIntent}
   */
  const { bag, lastStepResult } = await conversationalWorkflow(ctx);
  const assistantMsg =
    lastStepResult?.execute?.result || lastStepResult?.compensate?.result || "";
  await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, assistantMsg);
  return { bag, lastStepResult };
};
