import { Hono } from "hono";
import { cors } from "hono/cors";
import { aiWhatsappHandler } from "@/handlers/ai-whatsapp.handler";
import { aiTestHandler } from "@/handlers/ai-test.handler";
import { CTX } from "@/types/hono.types";
import { env } from "bun";
import { contextMiddleware } from "@/middlewares/context.middleware";
import { rateLimiter } from "hono-rate-limiter";
import { sentry } from "@hono/sentry";
import { professionalLogger, unifiedLogger } from "./middlewares/observability";

const app = new Hono<CTX>();

app.use(
  cors({
    origin: ["http://localhost:3000", env?.WAHA_API!, env?.CMS_API!],
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
  }),
);

// Rate limiter
app.use(
  "*",
  professionalLogger(),
  sentry({
    dsn: env?.SENTRY_DSN,
    // Tracing
    enableTracing: true,
    tracesSampleRate: 1.0, // Capture 100% of the transactions
  }),
  rateLimiter({
    // handler
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 200, // Limit each client to 100 requests per window
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "", // Use IP address as key
  }),
);

app.post(
  "/received-messages/:businessId",
  contextMiddleware,
  aiWhatsappHandler,
);

app.post("/test-ai/:businessId", contextMiddleware, aiTestHandler);

app.onError((error, c) => {
  // Enviar a Sentry
  c.get("sentry").captureException(error);

  return c.json(
    {
      error: "Internal server error",
    },
    500,
  );
});

// export default app;
export default {
  port: env?.PORT ?? 3000,
  fetch: app.fetch,
};
