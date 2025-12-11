import { Hono } from "hono";
import { WahaRecievedEvent } from "@/types/received-event";
import whatsappService from "@/services/whatsapp.service";
import { cors } from "hono/cors";
import { callAI } from "./services/ai.service";

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

  if (msgResponse.event !== "message") {
    return c.json({ message: "Invalid event" });
  }
  const toChatId = msgResponse.payload.from;

  const aiResponse = await whatsappService.beforeSend(
    {
      session: msgResponse.session,
      chatId: toChatId,
    },
    async () => {
      // const res = await c.env.AI.run("@cf/ibm-granite/granite-4.0-h-micro", {
      //   messages: [
      //     {
      //       role: "system",
      //       content: "Eres un asistente de reservaciones para restaurantes",
      //     },
      //     { role: "user", content: msgResponse.payload.body },
      //   ],
      // });
      // console.log({ res });
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
  const { text } = await callAI("Cuantas mesas hay en el restaurante");

  return c.json({ received: true, message: text });
});

// export default app;
export default {
  port: 3000,
  fetch: app.fetch,
};

// Verify webhook signature to ensure it's from WasenderApi
function verifySignature(req: Request) {
  const signature = req.headers.get("x-webhook-signature");
  const webhookSecret = process.env.WAHA_API_KEY; // Store securely
  if (!signature || !webhookSecret || signature !== webhookSecret) return false;
  return true;
}
