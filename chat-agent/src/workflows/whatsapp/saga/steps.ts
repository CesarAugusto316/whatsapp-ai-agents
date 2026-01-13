import { ISagaStep, SagaOrchestrator } from "@/saga/saga-orchestrator-dbos";
import whatsappService from "@/services/whatsapp.service";
import { AppContext } from "@/types/hono.types";
import { runReservationWorkflow } from "@/workflows/reservations/reservation.workflow";
import { StepConfig } from "@dbos-inc/dbos-sdk";

const stepConfig = {
  retriesAllowed: true,
  maxAttempts: 5,
  intervalSeconds: 2,
  backoffRate: 2,
} satisfies Omit<StepConfig, "name">;

type P = Record<string, unknown>;

export const sendSeen: ISagaStep<AppContext, P> = {
  name: "sendSeen",
  config: {
    execute: stepConfig,
  },
  execute: async ({ ctx, durableStep }) => {
    const args = {
      session: ctx.session,
      chatId: ctx.customerPhone,
    };
    return durableStep(
      async () =>
        (await whatsappService.sendSeen(args).then((r) => r.json())) as P,
    );
  },
};

export const sendStartTyping: ISagaStep<AppContext, P> = {
  name: "sendStartTyping",
  config: {
    execute: stepConfig,
    compensate: stepConfig,
  },
  execute: async ({ ctx, durableStep }) => {
    const args = {
      session: ctx.session,
      chatId: ctx.customerPhone,
    };
    return durableStep(
      async () =>
        (await whatsappService
          .sendStartTyping(args)
          .then((r) => r.json())) as P,
    );
  },
  compensate: async ({ ctx, durableStep }) => {
    const args = {
      session: ctx.session,
      chatId: ctx.customerPhone,
    };
    return durableStep(
      async () =>
        (await whatsappService.sendStopTyping(args).then((r) => r.json())) as P,
    );
  },
};

export const reservationWorklow: ISagaStep<AppContext, P> = {
  name: "reservationWorklow",
  execute: async ({ ctx }) => {
    return runReservationWorkflow(ctx) as unknown as P;
  },
};

export const sendStopTyping: ISagaStep<AppContext, P> = {
  name: "sendStopTyping",
  config: {
    execute: stepConfig,
  },
  execute: async ({ ctx, durableStep }) => {
    const args = {
      session: ctx.session,
      chatId: ctx.customerPhone,
    };
    return durableStep(
      async () =>
        (await whatsappService.sendStopTyping(args).then((r) => r.json())) as P,
    );
  },
};

export const sendText: ISagaStep<AppContext, P> = {
  name: "sendText",
  config: {
    execute: stepConfig,
  },
  execute: async ({ ctx, durableStep, getStepResult }) => {
    const text = getStepResult(
      "execute",
      "reservationWorklow",
    ) as unknown as string;

    const args = {
      text,
      session: ctx.session,
      chatId: ctx.customerPhone,
    };

    return durableStep(
      async () =>
        (await whatsappService.sendText(args).then((r) => r.json())) as P,
    );
  },
};

const whatsappSaga = new SagaOrchestrator({} as AppContext);

whatsappSaga
  .addStep(sendSeen)
  .addStep(sendStartTyping)
  .addStep(reservationWorklow)
  .addStep(sendStopTyping)
  .addStep(sendText);

export default whatsappSaga.start("whatsapp-saga", {
  workflowID: "businessId" + "customerPhone",
});
