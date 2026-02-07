import { FMStatus, InputIntent } from "@/domain/restaurant/booking";
import { BookingResult, reservationSaga } from "./booking-saga";
import { RestaurantProps } from "@/domain/restaurant";
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
  UPDATE_STARTED: reservationSaga.updateStarted,

  MAKE_VALIDATED: reservationSaga.makeValidated,
  UPDATE_VALIDATED: reservationSaga.updateValidated,
  CANCEL_VALIDATED: reservationSaga.cancelValidated,
};

/**
 *
 * @param ctx
 * @returns
 */
export const bookingStateOrchestrator = async (
  ctx: RestaurantProps,
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

  /**
   *
   * @todo refactor to use SagaOrchestrator
   * @see makeStarted
   * @see updateStarted
   * @see {InputIntent}
   */
  const { bag, lastStepResult } = await conversationalWorkflow(ctx);
  const assistantMsg =
    lastStepResult?.execute?.result || lastStepResult?.compensate?.result || "";
  await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, assistantMsg);
  return { bag, lastStepResult };
};
