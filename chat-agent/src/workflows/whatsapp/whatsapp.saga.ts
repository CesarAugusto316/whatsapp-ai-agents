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

type WhatappStepName =
  | "sendSeen"
  | "sendStartTyping"
  | "reservationFlow"
  | "sendStopTyping"
  | "sendText";

interface WhatsappSagaResults extends SagaBag {
  text: string;
}

export type WhatsappSagaTypes<
  C = AppContext,
  R = WhatsappSagaResults,
  K = WhatappStepName,
> = {
  Ctx: C;
  Result: R;
  Key: K;
};

type WhatsappSteps = ISagaStep<
  WhatsappSagaTypes["Ctx"],
  WhatsappSagaTypes["Result"],
  WhatsappSagaTypes["Key"]
>;

export const sendSeen: WhatsappSteps = {
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
  WhatsappSagaTypes["Ctx"],
  WhatsappSagaTypes["Result"],
  WhatsappSagaTypes["Key"]
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

export const sendStartTyping: WhatsappSteps = {
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

export const reservationWorklow: WhatsappSteps = {
  config: {
    execute: { name: "reservationFlow", ...stepConfig },
  },
  execute: async ({ ctx }) => {
    const res = await runReservationWorkflow(ctx);
    return { text: res };
  },
};

export const sendStopTyping: WhatsappSteps = {
  config: {
    execute: { name: "sendStopTyping", ...stepConfig },
  },
  execute: sendStopTypingCompensate,
};

export const sendText: WhatsappSteps = {
  config: {
    execute: { name: "sendText", ...stepConfig },
  },
  execute: async ({ ctx, durableStep, getStepResult }) => {
    const text = getStepResult("execute", "reservationFlow")?.text ?? "";

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
