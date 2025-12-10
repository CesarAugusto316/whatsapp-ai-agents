import { Hono } from "hono";
import { WahaRecievedEvent } from "@/types/received-event";
import { MyAgent } from "@/services/ai.service";
import { env } from "cloudflare:workers";
import whatsappService from "@/services/whatsapp.service";
import { cors } from "hono/cors";
import { getAgentByName } from "agents";

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
        await c.env.AI.run("@cf/ibm-granite/granite-4.0-h-micro", {
          prompt: msgResponse.payload.body,
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: msgResponse.payload.body },
          ],
        })
      ).response?.toString() || "AI response",
  );
  // console.log({ aiMessage });
  await whatsappService.sendText({
    chatId: toChatId,
    text: aiResponse,
    session: msgResponse.session,
  });

  // Named addressing
  // Best for: convenience method for creating or retrieving an agent by name/ID.
  const agent = await getAgentByName<CloudflareBindings, MyAgent>(
    c.env.MyAgent,
    businessId,
  );
  // Pass the request to our Agent instance
  return await agent.fetch(c.req.raw);
  // return c.json({ received: true, message: "AI Agent Response" });
});

export default app;
export { MyAgent };

// Verify webhook signature to ensure it's from WasenderApi
function verifySignature(req: Request) {
  const signature = req.headers.get("x-webhook-signature");
  const webhookSecret = env.WAHA_API_KEY; // Store securely
  if (!signature || !webhookSecret || signature !== webhookSecret) return false;
  return true;
}
