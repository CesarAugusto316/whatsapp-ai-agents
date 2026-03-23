import { SagaOrchestrator, SagaResult } from "@/application/patterns";
import { DomainCtx } from "@/domain/booking";
import {
  StartedFuncSagaResult,
  StartedSagaResult,
  startedSteps,
  StartedSteps,
  validatedSteps,
  ValidateFuncSagaResult,
  ValidateSagaResult,
  ValidateSagaSteps,
} from "./steps";

// started reservation (make | update)
const makeStarted: StartedFuncSagaResult = (ctx: DomainCtx) => {
  const status = ctx.bookingState?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<DomainCtx, StartedSagaResult, StartedSteps>({
    ctx,
  })
    .addStep(startedSteps.earlyConditions("create"))
    .addStep(startedSteps.collectAndValidate())
    .addStep(startedSteps.checkAvailability())
    .start();
};

const updateStarted: StartedFuncSagaResult = (ctx: DomainCtx) => {
  const status = ctx.bookingState?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<DomainCtx, StartedSagaResult, StartedSteps>({
    ctx,
  })
    .addStep(startedSteps.earlyConditions("update"))
    .addStep(startedSteps.collectAndValidate())
    .addStep(startedSteps.checkAvailability())
    .start();
};

// validated reservation (make | update | cancel)
const makeValidated: ValidateFuncSagaResult = (ctx: DomainCtx) => {
  const status = ctx.bookingState?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<DomainCtx, ValidateSagaResult, ValidateSagaSteps>(
    {
      ctx,
    },
  )
    .addStep(validatedSteps.created())
    .start();
};

const updateValidated: ValidateFuncSagaResult = (ctx: DomainCtx) => {
  const status = ctx.bookingState?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<DomainCtx, ValidateSagaResult, ValidateSagaSteps>(
    {
      ctx,
    },
  )
    .addStep(validatedSteps.updated())
    .start();
};

const cancelValidated: ValidateFuncSagaResult = (ctx: DomainCtx) => {
  const status = ctx.bookingState?.status;
  if (!status) throw new Error("Status is undefined");

  return new SagaOrchestrator<DomainCtx, ValidateSagaResult, ValidateSagaSteps>(
    {
      ctx,
    },
  )
    .addStep(validatedSteps.cancelled())
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

export type BookingSagaResult = SagaResult<
  ValidateSagaResult & StartedSagaResult,
  StartedSteps & ValidateSagaSteps
>;
