import { SagaOrchestrator, SagaResult } from "@/application/patterns";
import { RestaurantCtx } from "@/domain/restaurant";
import {
  startedSteps,
  StartedSagaResult,
  StartedSteps,
  StartedFuncSagaResult,
} from "./steps/started-steps";
import {
  validatedSteps,
  ValidateFuncSagaResult,
  ValidateSagaResult,
  ValidateSagaSteps,
} from "./steps/validated-steps";

// started reservation (make | update)
const makeStarted: StartedFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<RestaurantCtx, StartedSagaResult, StartedSteps>({
    ctx,
  })
    .addStep(startedSteps.earlyConditions("create"))
    .addStep(startedSteps.collectAndValidate())
    .addStep(startedSteps.checkAvailability("create"))
    .start();
};

const updateStarted: StartedFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<RestaurantCtx, StartedSagaResult, StartedSteps>({
    ctx,
  })
    .addStep(startedSteps.earlyConditions("update"))
    .addStep(startedSteps.collectAndValidate())
    .addStep(startedSteps.checkAvailability("update"))
    .start();
};

// validated reservation (make | update | cancel)
const makeValidated: ValidateFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<
    RestaurantCtx,
    ValidateSagaResult,
    ValidateSagaSteps
  >({
    ctx,
  })
    .addStep(validatedSteps.makeConfirmed())
    .addStep(validatedSteps.sendConfirmationMsg("create"))
    .addStep(validatedSteps.exit())
    .addStep(validatedSteps.restart())
    .start();
};

const updateValidated: ValidateFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<
    RestaurantCtx,
    ValidateSagaResult,
    ValidateSagaSteps
  >({
    ctx,
  })
    .addStep(validatedSteps.updateConfirmed())
    .addStep(validatedSteps.sendConfirmationMsg("update"))
    .addStep(validatedSteps.exit())
    .addStep(validatedSteps.restart())
    .start();
};

const cancelValidated: ValidateFuncSagaResult = (ctx: RestaurantCtx) => {
  const status = ctx.RESERVATION_STATE?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<
    RestaurantCtx,
    ValidateSagaResult,
    ValidateSagaSteps
  >({
    ctx,
  })
    .addStep(validatedSteps.cancelConfirmed())
    .addStep(validatedSteps.exit())
    .start();
};

/**
 *
 * @description reservationSaga esta divido en multiples partes cada una
 * representa una parte del proceso de reserva en especifico (SagaOrchestrator).
 * make, update, cancel  + (started | validated)
 */
export const reservationSaga = {
  makeStarted,
  updateStarted,
  makeValidated,
  updateValidated,
  cancelValidated,
};

export type ReservationResult = SagaResult<
  ValidateSagaResult & StartedSagaResult,
  StartedSteps & ValidateSagaSteps
>;
