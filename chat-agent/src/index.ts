import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { aiWhatsappHandler } from "@/handlers/ai-whatsapp.handler";
import { aiTestHandler } from "@/handlers/ai-test.handler";
import { CTX } from "@/types/hono.types";
import { env } from "bun";
import { contextMiddleware } from "@/middlewares/context.middleware";
import { rateLimiter } from "hono-rate-limiter";

const app = new Hono<CTX>();

app.use(
  cors({
    origin: ["http://localhost:3000", env?.WAHA_API!, env?.CMS_API!],
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
  }),
  logger(),
  rateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 100, // Limit each client to 100 requests per window
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "", // Use IP address as key
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
