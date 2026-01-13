import { ISagaStep } from "@/saga/saga-orchestrator-dbos";
import whatsappService from "@/services/whatsapp.service";
import { AppContext } from "@/types/hono.types";

type P = Record<string, string>;

export const sendStartTyping: ISagaStep<AppContext, P> = {
  name: "sendSeend",
  execute: async (ctx, get, durableStep) => {
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
