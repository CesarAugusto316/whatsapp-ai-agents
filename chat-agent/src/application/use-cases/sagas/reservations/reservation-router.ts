import {
  FlowOptions,
  FMStatus,
} from "@/domain/restaurant/reservations/reservation.types";
import { reservationSaga } from "./reservation-saga";
import { StartedFuncSagaResult } from "./steps/started-steps";
import { ValidateFuncSagaResult } from "./steps/validated-steps";
import { RestaurantCtx } from "@/domain/restaurant/context.types";

const statusSagas: Partial<
  Record<FMStatus, StartedFuncSagaResult | ValidateFuncSagaResult>
> = {
  MAKE_STARTED: reservationSaga.makeStarted,
  UPDATE_STARTED: reservationSaga.updateStarted,

  MAKE_VALIDATED: reservationSaga.makeValidated,
  UPDATE_VALIDATED: reservationSaga.updateValidated,
  CANCEL_VALIDATED: reservationSaga.cancelValidated,
};

// EXAMPLE
const noStatusSagas: Partial<
  Record<FMStatus, StartedFuncSagaResult | ValidateFuncSagaResult>
> = {
  [FlowOptions.MAKE_RESERVATION]: reservationSaga.makeStarted, // EXAMPLE
  [FlowOptions.UPDATE_RESERVATION]: reservationSaga.makeStarted, // EXAMPLE
  [FlowOptions.CANCEL_RESERVATION]: reservationSaga.makeStarted, // EXAMPLE
};

export const reservationSagaRouter = async (
  ctx: RestaurantCtx,
  status: FMStatus,
) => {
  //
  const sagaOrchestrator = statusSagas[status];
  if (!sagaOrchestrator) throw new Error(`No saga found for status ${status}`);

  const { lastStepResult } = await sagaOrchestrator(ctx);
  if (lastStepResult?.execute?.result) {
    return { result: lastStepResult?.execute.result };
  }
  return { result: "" };
};
