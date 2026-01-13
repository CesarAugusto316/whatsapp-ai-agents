import { formatForWhatsApp } from "@/helpers/format-for-whatsapp";
import {
  FuncSagaStep,
  ISagaStep,
  SagaBag,
} from "@/saga/saga-orchestrator-dbos";
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

export interface WhatsappSagaResults extends SagaBag {
  text: string;
}

export const sendSeen: ISagaStep<AppContext, WhatsappSagaResults> = {
  config: {
    execute: { name: "sendSeen", ...stepConfig },
  },
  execute: async ({ ctx, durableStep }) => {
    const args = {
      session: ctx.session,
      chatId: ctx.customerPhone,
    };
    return durableStep(
      async () =>
        (await whatsappService
          .sendSeen(args)
          .then((r) => r.json())) as WhatsappSagaResults,
    );
  },
};

const sendStopTypingCompensate: FuncSagaStep<
  AppContext,
  WhatsappSagaResults
> = async ({ ctx, durableStep }) => {
  const args = {
    session: ctx.session,
    chatId: ctx.customerPhone,
  };
  return durableStep(
    async () =>
      (await whatsappService
        .sendStopTyping(args)
        .then((r) => r.json())) as WhatsappSagaResults,
  );
};

export const sendStartTyping: ISagaStep<AppContext, WhatsappSagaResults> = {
  config: {
    execute: { name: "sendStartTyping", ...stepConfig },
    compensate: { name: "sendStopTyping", ...stepConfig },
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
          .then((r) => r.json())) as WhatsappSagaResults,
    );
  },
  compensate: sendStopTypingCompensate,
};

export const reservationWorklow: ISagaStep<AppContext, WhatsappSagaResults> = {
  config: {
    execute: { name: "reservationWorklow", ...stepConfig },
  },
  execute: async ({ ctx }) => {
    const res = await runReservationWorkflow(ctx);
    return { text: res };
  },
};

export const sendStopTyping: ISagaStep<AppContext, WhatsappSagaResults> = {
  config: {
    execute: { name: "sendStopTyping", ...stepConfig },
  },
  execute: sendStopTypingCompensate,
};

export const sendText: ISagaStep<AppContext, WhatsappSagaResults> = {
  config: {
    execute: { name: "sendText", ...stepConfig },
  },
  execute: async ({ ctx, durableStep, getStepResult }) => {
    const text = getStepResult(
      "execute",
      "reservationWorklow",
    ) as unknown as string;

    const args = {
      text: formatForWhatsApp(text),
      session: ctx.session,
      chatId: ctx.customerPhone,
    };

    return durableStep(
      async () =>
        (await whatsappService
          .sendText(args)
          .then((r) => r.json())) as WhatsappSagaResults,
    );
  },
};
