import {
  FlowOptions,
  FMStatus,
  InputIntent,
} from "@/domain/restaurant/reservations";
import { ReservationResult, reservationSaga } from "./reservation-saga";
import { StartedFuncSagaResult } from "./steps/started-steps";
import { ValidateFuncSagaResult } from "./steps/validated-steps";
import { RestaurantCtx } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters";
import { fallbackWorkflow } from "./steps/fallback-steps";

const statusSagaMap: Partial<
  Record<FMStatus, StartedFuncSagaResult | ValidateFuncSagaResult>
> = {
  MAKE_STARTED: reservationSaga.makeStarted,
  UPDATE_STARTED: reservationSaga.updateStarted,

  MAKE_VALIDATED: reservationSaga.makeValidated,
  UPDATE_VALIDATED: reservationSaga.updateValidated,
  CANCEL_VALIDATED: reservationSaga.cancelValidated,
};

// EXAMPLE
const initialStatusSagaMap: Partial<
  Record<FMStatus, StartedFuncSagaResult | ValidateFuncSagaResult>
> = {
  [FlowOptions.MAKE_RESERVATION]: reservationSaga.makeStarted, // EXAMPLE
  [FlowOptions.UPDATE_RESERVATION]: reservationSaga.makeStarted, // EXAMPLE
  [FlowOptions.CANCEL_RESERVATION]: reservationSaga.makeStarted, // EXAMPLE
};

export const reservationStateOrchestrator = async (
  ctx: RestaurantCtx,
): Promise<ReservationResult> => {
  //
  const status = ctx.RESERVATION_STATE?.status;
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
    if (!sagaOrchestrator)
      throw new Error(`No saga found for status ${status}`);

    const { lastStepResult, bag } = await sagaOrchestrator(ctx);

    if (lastStepResult?.execute?.result) {
      const { result } = lastStepResult.execute;

      if (result && result !== InputIntent.CUSTOMER_QUESTION) {
        await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, result);
        return { lastStepResult, bag };
      }
    }
  }
  // else {
  //   /** @todo refactor to use SagaOrchestrator and Saga mapper */
  //   FlowOptions;
  //   // 1. FLOW SELECTION & INITIALIZATION (pre-FSM, no authoritative)
  // }

  /**
   *
   * @todo refactor to use SagaOrchestrator
   * @see makeStarted
   * @see updateStarted
   * @see {InputIntent}
   */
  const w2Result: string = await fallbackWorkflow(ctx);
  await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, w2Result);
  return { lastStepResult: { execute: { result: w2Result } }, bag: {} };
};
