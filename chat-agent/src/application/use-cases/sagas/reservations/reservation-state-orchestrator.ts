import { FMStatus, InputIntent } from "@/domain/restaurant/reservations";
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
    if (!sagaOrchestrator) {
      throw new Error(`No saga found for status ${status}`);
    }
    const { lastStepResult, bag } = await sagaOrchestrator(ctx);
    const result =
      lastStepResult?.execute?.result || lastStepResult?.compensate?.result;

    if (result && result !== InputIntent.CUSTOMER_QUESTION) {
      await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, result);
      return { bag, lastStepResult };
    }
  }

  /**
   *
   * @todo refactor to use SagaOrchestrator
   * @see makeStarted
   * @see updateStarted
   * @see {InputIntent}
   */
  const { bag, lastStepResult } = await fallbackWorkflow(ctx);
  const message =
    lastStepResult?.execute?.result || lastStepResult?.compensate?.result || "";
  await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, message);
  return { bag, lastStepResult };
};
