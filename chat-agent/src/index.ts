import { Hono } from "hono";
import { WahaRecievedEvent } from "@/types/received-event";
import { env } from "cloudflare:workers";
import whatsappService from "@/services/whatsapp.service";
import { cors } from "hono/cors";

// AI SDK PROJECT EXAMPLE
// https://github.com/gopinav/Next.js-AI-Tutorials/tree/main/src/app/api
const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(
  cors({
    origin: ["*"],
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
  }),
);

app.post("/received-messages/:businessId", async (c) => {
  // if (!verifySignature(c.req.raw)) {
  //   return c.json({ error: "Invalid signature" }, 401);
  const businessId = c.req.param("businessId");
  const msgResponse = await c.req.json<WahaRecievedEvent>();
  console.log({ msgResponse });
  console.log({ _data: JSON.stringify(msgResponse.payload._data) });
  if (msgResponse.event !== "message") {
    return c.json({ message: "Invalid event" });
  }
  const toChatId = msgResponse.payload.from || msgResponse.payload.id;

  const aiResponse = await whatsappService.beforeSend(
    {
      session: msgResponse.session,
      chatId: toChatId,
    },
    async () => {
      // const res = await c.env.AI.run("@cf/ibm-granite/granite-4.0-h-micro", {
      //   // prompt: msgResponse.payload.body,
      //   messages: [
      //     {
      //       role: "system",
      //       content: "Eres un asistente de reservaciones para restaurantes",
      //     },
      //     { role: "user", content: msgResponse.payload.body },
      //   ],
      // });
      // console.log({ res });
      // return res.response?.toString() || "AI response";
      //
      return "AI IBM response";
    },
  );
  console.log({ aiResponse });

  await whatsappService.sendText({
    chatId: toChatId,
    text: aiResponse,
    session: msgResponse.session,
  });

  return c.json({ received: true, message: "AI Agent Response" });
});

export default app;

// Verify webhook signature to ensure it's from WasenderApi
function verifySignature(req: Request) {
  const signature = req.headers.get("x-webhook-signature");
  const webhookSecret = env.WAHA_API_KEY; // Store securely
  if (!signature || !webhookSecret || signature !== webhookSecret) return false;
  return true;
}
