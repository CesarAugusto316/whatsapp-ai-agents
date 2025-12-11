import { Hono } from "hono";
import { WahaRecievedEvent } from "@/types/received-event";
import whatsappService from "@/services/whatsapp.service";
import { cors } from "hono/cors";
import { aiAgent } from "./services/ai.service";

// AI SDK PROJECT EXAMPLE
// https://github.com/gopinav/Next.js-AI-Tutorials/tree/main/src/app/api
const app = new Hono();

app.use(
  cors({
    origin: ["*"],
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
  }),
);

app.post("/received-messages/:businessId", async (c) => {
  // const businessId = c.req.param("businessId");
  const msgResponse = await c.req.json<WahaRecievedEvent>();
  const toChatId = msgResponse.payload.from;

  if (msgResponse.event !== "message") {
    return c.json({ message: "Invalid event" });
  }
  const aiResponse = await whatsappService.beforeSend(
    {
      session: msgResponse.session,
      chatId: toChatId,
    },
    async () => {
      return "AI response";
    },
  );
  await whatsappService.sendText({
    chatId: toChatId,
    text: aiResponse,
    session: msgResponse.session,
  });
  return c.json({ received: true, message: "AI Agent Response" });
});

app.post("/test-ai", async (c) => {
  const prompt = await c.req.json<WahaRecievedEvent>();
  const result = await aiAgent(prompt.payload.body);

  return c.json({ received: true, text: result.text, result });
});

// export default app;
export default {
  port: 3000,
  fetch: app.fetch,
};

// // Verify webhook signature to ensure it's from WasenderApi
// function verifySignature(req: Request) {
//   const signature = req.headers.get("x-webhook-signature");
//   const webhookSecret = process.env.WAHA_API_KEY; // Store securely
//   if (!signature || !webhookSecret || signature !== webhookSecret) return false;
//   return true;
// }
