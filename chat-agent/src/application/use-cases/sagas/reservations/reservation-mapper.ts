import { SagaOrchestrator } from "@/application/patterns/saga-orchestrator/saga-orchestrator";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import { FMStatus } from "@/domain/restaurant/reservations/reservation.types";
import {
  checkAvailability,
  collectAndValidate,
  CollectDataSagaResult,
  CollectDataSteps,
  earlyConditions,
  FuncSagaResult,
} from "./make-started";

/**
 *
 * @param ctx
 * @returns
 */
const makeStarted: FuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  return new SagaOrchestrator<
    RestaurantCtx,
    CollectDataSagaResult,
    CollectDataSteps
  >({ ctx, dbosConfig: { workflowName: status } })
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
const updateStarted: FuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  return new SagaOrchestrator<
    RestaurantCtx,
    CollectDataSagaResult,
    CollectDataSteps
  >({ ctx, dbosConfig: { workflowName: status } })
    .addStep(earlyConditions("update"))
    .addStep(collectAndValidate())
    .addStep(checkAvailability("update"))
    .start();
};

const reservationSagas: Partial<Record<FMStatus, FuncSagaResult>> = {
  MAKE_RESTARTED: makeStarted,
  UPDATE_STARTED: updateStarted,
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
