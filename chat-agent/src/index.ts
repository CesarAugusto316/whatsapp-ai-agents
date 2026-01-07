import { Hono } from "hono";
import { cors } from "hono/cors";
import { aiWhatsappHandler } from "@/handlers/ai-whatsapp.handler";
import { aiTestHandler } from "@/handlers/ai-test.handler";
import { CTX } from "@/types/hono.types";
import { env } from "bun";
import { contextMiddleware } from "@/middlewares/context.middleware";

const app = new Hono<CTX>();

app.use(
  cors({
    origin: ["*"],
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
  }),
);

app.post(
  "/received-messages/:businessId",
  contextMiddleware,
  aiWhatsappHandler,
);
app.post("/test-ai/:businessId", contextMiddleware, aiTestHandler);

// export default app;
export default {
  port: env?.PORT ?? 3000,
  fetch: app.fetch,
};
