import {
  FlowOptions,
  FMStatus,
} from "@/domain/restaurant/reservations/reservation.types";
import { reservationSaga } from "./reservation-saga";
import { StartedFuncSagaResult } from "./steps/started-steps";
import { ValidateFuncSagaResult } from "./steps/validated-steps";
import { RestaurantCtx } from "@/domain/restaurant/context.types";

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
  status: FMStatus,
) => {
  //
  const sagaOrchestrator = statusSagaMap[status];
  if (!sagaOrchestrator) throw new Error(`No saga found for status ${status}`);

  const { lastStepResult } = await sagaOrchestrator(ctx);

  if (lastStepResult?.execute?.result) {
    const { result } = lastStepResult.execute;
    return { result };
  }
  return { result: "" };
};
