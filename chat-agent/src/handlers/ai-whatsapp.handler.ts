import { CTX, AppContext } from "@/types/hono.types";
import { runWhatsappWorkflow } from "@/workflows/whatsapp/whatsapp.workflow";
import { Handler } from "hono/types";

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

  // 1. Run workflow
  const result = await runWhatsappWorkflow(ctx);

  // 2. Return response
  return c.json({ received: true, message: result.text });
};
