import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { WahaRecievedEvent } from "./types/received-event";

const apiKey = env.WAHA_API_KEY; // waha API key

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/hello", async (c) => {
  return c.json({ hi: "Hello" });
});

app.post("/received-messages", async (c) => {
  // if (!verifySignature(c.req.raw)) {
  //   return c.json({ error: "Invalid signature" }, 401);
  // }
  const msgResponse = await c.req.json<WahaRecievedEvent>();

  if (msgResponse.event !== "message") {
    return c.json({ message: "Invalid event" });
  }
  const aiResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    prompt: msgResponse.payload.body,
  });
  await fetch(
    new Request("'http://localhost:3000/api/sendText'", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text: aiResponse?.response?.toString() || "AI response",
        to: `+${msgResponse.me.id.split("@").at(0)}`,
      }),
    }),
  );
  return c.json({ received: true, message: "AI Agent Response" });
});

export default app;

// Verify webhook signature to ensure it's from WasenderApi
function verifySignature(req: Request) {
  const signature = req.headers.get("x-webhook-signature");
  const webhookSecret = env.WASENDER_WEBHOOK_SECRET; // Store securely
  if (!signature || !webhookSecret || signature !== webhookSecret) return false;
  return true;
}
