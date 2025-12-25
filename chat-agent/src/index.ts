import { Hono } from "hono";
import { cors } from "hono/cors";
import { aiAgentHandler } from "./handlers/ai-agent.handler";
import {
  makeReservationHandler,
  flowHandler,
} from "./handlers/ai-test.handler";
import { WahaRecievedEvent } from "./types/whatsapp/received-event";
import businessService from "./services/business.service";
import { CTX } from "./types/hono.types";
import reservationService from "./services/reservationCache.service";

// AI SDK PROJECT EXAMPLE
// https://github.com/gopinav/Next.js-AI-Tutorials/tree/main/src/app/api
const app = new Hono<CTX>();

app.use(
  cors({
    origin: ["*"],
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
  }),
);

app.use("/*", async (c, next) => {
  const custumerRecievedEvent = await c.req.json<WahaRecievedEvent>();
  const businessId = custumerRecievedEvent.metadata?.businessId;
  const session = custumerRecievedEvent.session;
  const event = custumerRecievedEvent.event;
  const customerMessage = (custumerRecievedEvent.payload.body || "").trim();
  const customerPhone = custumerRecievedEvent.payload.from;
  const chatKey = `chat:${businessId}:${customerPhone}`;
  const reservationKey = `reservation:${businessId}:${customerPhone}`;
  const customer = await businessService.getCostumerByPhone({
    "where[business][equals]": businessId,
    "where[phoneNumber][like]": customerPhone,
  });
  const business = await businessService.getBusinessById(businessId);
  const currentReservation = await reservationService.get(reservationKey);
  c.set("session", session);
  c.set("businessId", businessId);
  c.set("business", business);
  c.set("customerPhone", customerPhone);
  c.set("customer", customer);
  c.set("customerMessage", customerMessage);
  c.set("chatKey", chatKey);
  c.set("whatsappEvent", event);
  c.set("reservationKey", reservationKey);
  c.set("currentReservation", currentReservation);

  if (!customerMessage) {
    return c.json({ error: "Customer message not received" }, 400);
  }
  if (!businessId) {
    return c.json({ error: "Business ID not received" }, 400);
  }
  if (!customerPhone) {
    return c.json({ error: "Customer phone not received" }, 400);
  }
  await next();
});

app.post("/received-messages/:businessId", aiAgentHandler);
app.post("/test-ai", makeReservationHandler, flowHandler);

// export default app;
export default {
  port: 3000,
  fetch: app.fetch,
};
