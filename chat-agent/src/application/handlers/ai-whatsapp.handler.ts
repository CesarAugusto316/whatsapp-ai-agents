import { Handler } from "hono/types";
import { DomainCtx } from "@/domain/context.types";
import { ReservationCtx } from "@/domain/restaurant/context.types";
import { SagaOrchestrator } from "../patterns/saga-orchestrator/saga-orchestrator-dbos";
import {
  reservationWorklow,
  sendSeen,
  sendStartTyping,
  sendStopTyping,
  sendText,
  WhatsappSagaTypes,
} from "../use-cases/workflows/whatsapp/whatsapp.saga";

export const aiWhatsappHandler: Handler<DomainCtx<ReservationCtx>> = async (
  c,
) => {
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
  } satisfies ReservationCtx;

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
  });

  // 2. Start the WhatsApp Saga
  const result = await whatsappSaga
    .addStep(sendSeen)
    .addStep(sendStartTyping)
    .addStep(reservationWorklow)
    .addStep(sendStopTyping)
    .addStep(sendText)
    .start();

  // 3. Return response
  return c.json({
    received: true,
    message: result?.["execute:reservationFlow"].text ?? "",
  });
};
