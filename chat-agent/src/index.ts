import { Hono } from "hono";
import { env } from "cloudflare:workers";
import { WahaRecievedEvent } from "@/types/received-event";
import whatsappService from "@/services/whatsapp.service";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// app.get("/hello", async (c) => {
//   await whatsappService.sendText({
//     // chatId: "593984393446@c.us",
//     chatId: "593 98 439 3446@c.us",
//     text: "Waha API",
//     session: "default",
//   });
//   return c.json({ received: true, message: "AI Agent Response" });
// });

app.post("/received-messages/:businessId", async (c) => {
  // if (!verifySignature(c.req.raw)) {
  //   return c.json({ error: "Invalid signature" }, 401);
  const id = c.req.param("businessId");
  const msgResponse = await c.req.json<WahaRecievedEvent>();

  if (msgResponse.event !== "message") {
    return c.json({ message: "Invalid event" });
  }
  // const aiResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
  //   prompt: msgResponse.payload.body,
  // });
  // const aiMessage = aiResponse?.response?.toString() || "AI response";

  const toChatId = msgResponse.payload.from || msgResponse.payload.id;
  const aiResponse = await whatsappService.beforeSend(
    {
      session: msgResponse.session,
      chatId: toChatId,
    },
    async () =>
      (
        await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
          prompt: msgResponse.payload.body,
        })
      ).response?.toString() || "AI response",
  );
  // console.log({ aiMessage });
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
