import { SagaOrchestrator } from "@/application/patterns/saga-orchestrator/saga-orchestrator";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import { FMStatus } from "@/domain/restaurant/reservations/reservation.types";
import {
  started,
  StartedSagaResult,
  StartedSteps,
  StartedFuncSagaResult,
} from "./reservation-started";
import {
  validated,
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
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<RestaurantCtx, StartedSagaResult, StartedSteps>({
    ctx,
    dbosConfig: { workflowName: status },
  })
    .addStep(started.earlyConditions("create"))
    .addStep(started.collectAndValidate())
    .addStep(started.checkAvailability("create"))
    .start();
};

/**
 *
 * @param ctx
 * @returns
 */
const updateStarted: StartedFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<RestaurantCtx, StartedSagaResult, StartedSteps>({
    ctx,
    dbosConfig: { workflowName: status },
  })
    .addStep(started.earlyConditions("update"))
    .addStep(started.collectAndValidate())
    .addStep(started.checkAvailability("update"))
    .start();
};

/**
 *
 * @param ctx
 * @returns
 */
const makeValidated: ValidateFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<
    RestaurantCtx,
    ValidateSagaResult,
    ValidateSagaSteps
  >({
    ctx,
    dbosConfig: { workflowName: status },
  })
    .addStep(validated.makeConfirmed())
    .addStep(validated.sendConfirmationMsg("create"))
    .addStep(validated.exit())
    .addStep(validated.restart())
    .start();
};

/**
 *
 * @param ctx
 * @returns
 */
const updateValidated: ValidateFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<
    RestaurantCtx,
    ValidateSagaResult,
    ValidateSagaSteps
  >({
    ctx,
    dbosConfig: { workflowName: status },
  })
    .addStep(validated.updateConfirmed())
    .addStep(validated.sendConfirmationMsg("update"))
    .addStep(validated.exit())
    .addStep(validated.restart())
    .start();
};

/**
 *
 * @param ctx
 * @returns
 */
const cancelValidated: ValidateFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<
    RestaurantCtx,
    ValidateSagaResult,
    ValidateSagaSteps
  >({
    ctx,
    dbosConfig: { workflowName: status },
  })
    .addStep(validated.cancelConfirmed())
    .addStep(validated.exit())
    .start();
};

const reservationSagas: Partial<
  Record<FMStatus, StartedFuncSagaResult | ValidateFuncSagaResult>
> = {
  MAKE_STARTED: makeStarted,
  UPDATE_STARTED: updateStarted,

  MAKE_VALIDATED: makeValidated,
  UPDATE_VALIDATED: updateValidated,
  CANCEL_VALIDATED: cancelValidated,
};

export const routeSagaOrchestrator = async (
  ctx: RestaurantCtx,
  status: FMStatus,
) => {
  //
  const orchestrator = reservationSagas[status];
  if (!orchestrator) throw new Error(`No saga found for status ${status}`);

  const { lastStepResult } = await orchestrator(ctx);
  if (lastStepResult?.execute?.result) {
    return { result: lastStepResult?.execute.result };
  }
  return { result: "" };
};
