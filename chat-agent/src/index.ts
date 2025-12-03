import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { WhatsAppWebhookPayload } from "./types";

const apiKey = env.WASENDER_API_KEY; // Session-specific API key

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/hello", async (c) => {
  const res = await fetch(
    new Request("https://www.wasenderapi.com/api/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: "+593984393446",
        text: "Hello from WasenderAPI César!",
      }),
    }),
  );
  return c.json(await res.json());
});

app.post("/message", async (c) => {
  if (!verifySignature(c.req.raw)) {
    return c.json({ error: "Invalid signature" }, 401);
  }
  // c.req.
  const payload = (await c.req.json()) as WhatsAppWebhookPayload;

  if (payload.event === "webhook.test") {
    return c.json({ received: true, message: "API response test" });
  }
  if (payload.event === "messages.received") {
    const messages = payload?.data?.messages;
    const phoneNumber =
      messages?.key?.cleanedSenderPn || messages?.key?.senderPn?.split("@")[0];

    const sessionId = messages?.key?.id;
    const name = messages?.pushName;
    const messageTimestamp = messages?.messageTimestamp;

    const messageContent =
      messages?.messageBody || messages?.message?.extendedTextMessage?.text;
    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
      prompt: messageContent,
    });
    const res = await fetch(
      new Request("https://www.wasenderapi.com/api/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text: response?.response?.toString() || "AI response",
          to: `+${phoneNumber}`,
        }),
      }),
    );
    return c.json({
      received: true,
      gtp: response,
      wasenderRes: await res.json(),
    });
  }
  return c.json({ received: true, message: "API response" });
});

export default app;

// Verify webhook signature to ensure it's from WasenderApi
function verifySignature(req: Request) {
  const signature = req.headers.get("x-webhook-signature");
  const webhookSecret = env.WASENDER_WEBHOOK_SECRET; // Store securely
  if (!signature || !webhookSecret || signature !== webhookSecret) return false;
  return true;
}
