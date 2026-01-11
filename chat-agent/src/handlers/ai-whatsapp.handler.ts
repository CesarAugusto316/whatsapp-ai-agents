import { CTX, AppContext } from "@/types/hono.types";
import { runReservationWorkflow } from "@/workflows/reservations/reservation.workflow";
import { whatsappWorkflow } from "@/workflows/whatsapp/whatsapp.workflow";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { Handler } from "hono/types";

export const aiWhatsappHandler: Handler<CTX> = async (ctx) => {
  const appContext = {
    session: ctx.get("session"),
    whatsappEvent: ctx.get("whatsappEvent"),
    RESERVATION_CACHE: ctx.get("RESERVATION_CACHE"),
    customerMessage: ctx.get("customerMessage"),
    customerPhone: ctx.get("customerPhone"),
    business: ctx.get("business"),
    customer: ctx.get("customer"),
    businessId: ctx.get("businessId"),
    chatKey: ctx.get("chatKey"),
    reservationKey: ctx.get("reservationKey"),
  } satisfies AppContext;

  if (appContext.whatsappEvent !== "message") {
    return ctx.json({ message: "Invalid event" });
  }

  // 1. Register workflow
  const runWhatsappWorkflow = DBOS.registerWorkflow(whatsappWorkflow, {
    name: "whatsapp",
  });

  // 2. Run workflow
  const whatsappRes = await runWhatsappWorkflow(
    appContext,
    runReservationWorkflow,
  );

  // 3. Return response
  return ctx.json({ received: true, message: whatsappRes.text });
};
