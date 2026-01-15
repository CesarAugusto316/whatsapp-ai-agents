import { Handler } from "hono/types";
import { DomainCtx } from "@/domain/context.types";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import {
  reservationSagaStep,
  sendSeen,
  sendStartTyping,
  sendStopTyping,
  sendText,
  WhatsappSagaTypes,
} from "@/application/use-cases/sagas/whatsapp.saga";
import { SagaOrchestrator } from "@/application/patterns/saga-orchestrator/saga-orchestrator";

export const whatsappReservationHandler: Handler<
  DomainCtx<RestaurantCtx>
> = async (c) => {
  const ctx = {
    session: c.get("session"),
    whatsappEvent: c.get("whatsappEvent"),
    RESERVATION_STATE: c.get("RESERVATION_STATE"),
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    business: c.get("business"),
    customer: c.get("customer"),
    businessId: c.get("businessId"),
    chatKey: c.get("chatKey"),
    reservationKey: c.get("reservationKey"),
  } satisfies RestaurantCtx;

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
    .addStep(reservationSagaStep)
    .addStep(sendStopTyping)
    .addStep(sendText)
    .start();

  // 3. Return response
  return c.json({
    received: true,
    message: result?.["execute:reservationFlow"].text ?? "",
  });
};
