import { Hono } from "hono";
import { env } from "cloudflare:workers";
import { WahaRecievedEvent } from "@/types/received-event";
import { whatsappService } from "@/services/whatsapp.service";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/hello", async (c) => {
  return c.json({ hi: "Hello" });
});

app.post("/received-messages/:id", async (c) => {
  // if (!verifySignature(c.req.raw)) {
  //   return c.json({ error: "Invalid signature" }, 401);
  const id = c.req.param("id");
  const msgResponse = await c.req.json<WahaRecievedEvent>();

  if (msgResponse.event !== "message") {
    return c.json({ message: "Invalid event" });
  }
  const aiResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    prompt: msgResponse.payload.body,
  });
  const message = aiResponse?.response?.toString() || "AI response";
  await whatsappService.sendText({
    chatId: msgResponse.id,
    text: message,
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
