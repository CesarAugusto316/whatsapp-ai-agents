import { CTX, AppContext } from "@/types/hono.types";
import { Handler } from "hono/types";
import { SagaOrchestrator } from "@/saga/saga-orchestrator-dbos";
import {
  reservationWorklow,
  sendSeen,
  sendStartTyping,
  sendStopTyping,
  sendText,
  WhatsappSagaTypes,
} from "@/workflows/whatsapp/whatsapp.saga";

export const aiWhatsappHandler: Handler<CTX> = async (c) => {
  const ctx = {
    session: c.get("session"),
    whatsappEvent: c.get("whatsappEvent"),
    RESERVATION_CACHE: c.get("RESERVATION_CACHE"),
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    business: c.get("business"),
    customer: c.get("customer"),
    businessId: c.get("businessId"),
    chatKey: c.get("chatKey"),
    reservationKey: c.get("reservationKey"),
  } satisfies AppContext;

  if (ctx.whatsappEvent !== "message") {
    return c.json({ message: "Invalid event" });
  }

  // 1. Initialize the WhatsApp Saga
  const whatsappSaga = new SagaOrchestrator<
    WhatsappSagaTypes["Ctx"],
    WhatsappSagaTypes["Result"],
    WhatsappSagaTypes["Key"]
  >({
    ctx,
    dbosConfig: {
      workflowName: "whatsapp-saga",
      args: { workflowID: ctx.chatKey },
    },
  });

  whatsappSaga
    .addStep(sendSeen)
    .addStep(sendStartTyping)
    .addStep(reservationWorklow)
    .addStep(sendStopTyping)
    .addStep(sendText);

  // 2. Start the WhatsApp Saga
  const result = await whatsappSaga.start();

  // 3. Return response
  return c.json({
    received: true,
    message: result?.["compensate:reservationFlow"].text ?? "",
  });
};
