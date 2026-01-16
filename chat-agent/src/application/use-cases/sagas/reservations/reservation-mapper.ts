import { SagaOrchestrator } from "@/application/patterns/saga-orchestrator/saga-orchestrator";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import { FMStatus } from "@/domain/restaurant/reservations/reservation.types";
import {
  checkAvailability,
  collectAndValidate,
  StartedSagaResult,
  StartedSteps,
  earlyConditions,
  StartedFuncSagaResult,
} from "./reservation-started";
import {
  exit,
  makeConfirmation,
  restart,
  sendConfirmationMsg,
  updateConfirmation,
  ValidateFuncSagaResult,
  ValidateSagaResult,
  ValidateSagaSteps,
} from "./reservation-validated";

/**
 *
 * @param ctx
 * @returns
 */
const makeStarted: StartedFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  return new SagaOrchestrator<RestaurantCtx, StartedSagaResult, StartedSteps>({
    ctx,
    dbosConfig: { workflowName: status },
  })
    .addStep(earlyConditions("create"))
    .addStep(collectAndValidate())
    .addStep(checkAvailability("create"))
    .start();
};

/**
 *
 * @param ctx
 * @returns
 */
const makeValidated: ValidateFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  return new SagaOrchestrator<
    RestaurantCtx,
    ValidateSagaResult,
    ValidateSagaSteps
  >({
    ctx,
    dbosConfig: { workflowName: status },
  })
    .addStep(makeConfirmation())
    .addStep(sendConfirmationMsg("create"))
    .addStep(exit())
    .addStep(restart())
    .start();
};

/**
 *
 * @param ctx
 * @returns
 */
const updateStarted: StartedFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  return new SagaOrchestrator<RestaurantCtx, StartedSagaResult, StartedSteps>({
    ctx,
    dbosConfig: { workflowName: status },
  })
    .addStep(earlyConditions("update"))
    .addStep(collectAndValidate())
    .addStep(checkAvailability("update"))
    .start();
};

/**
 *
 * @param ctx
 * @returns
 */
const updateValidated: ValidateFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  return new SagaOrchestrator<
    RestaurantCtx,
    ValidateSagaResult,
    ValidateSagaSteps
  >({
    ctx,
    dbosConfig: { workflowName: status },
  })
    .addStep(updateConfirmation())
    .addStep(sendConfirmationMsg("update"))
    .addStep(exit())
    .addStep(restart())
    .start();
};

const reservationSagas: Partial<
  Record<FMStatus, StartedFuncSagaResult | ValidateFuncSagaResult>
> = {
  MAKE_RESTARTED: makeStarted,
  MAKE_VALIDATED: makeValidated,
  UPDATE_STARTED: updateStarted,
  UPDATE_VALIDATED: updateValidated,
};

export const reservationSagaMapper = async (
  ctx: RestaurantCtx,
  status: FMStatus,
) => {
  //
  const r = await reservationSagas?.[status]?.(ctx);
  if (r?.lastStepResult?.execute?.result) {
    return { result: r?.lastStepResult?.execute.result };
  }
  return { result: "" };
};
