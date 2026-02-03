import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "bun";
import { rateLimiter } from "hono-rate-limiter";
import * as Sentry from "@sentry/bun";
import { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";
import { DomainCtx } from "@/domain";
import { RestaurantCtx } from "@/domain/restaurant";
import {
  loggerMiddleware,
  bootstrapMiddleware,
} from "@/application/middlewares";
import {
  whatsappReservationHandler,
  testReservationHandler,
} from "@/application/handlers/restaurant";
import {
  semanticIngestionHandler,
  semanticIntent,
} from "./application/handlers/semantic";

const app = new Hono<DomainCtx<RestaurantCtx>>();

Sentry.init({
  dsn: env?.SENTRY_DSN,
  enabled: env.NODE_ENV === "production",
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  // Enable logs to be sent to Sentry
  enableLogs: true,
});

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
  loggerMiddleware(),
  rateLimiter({
    // handler
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 200, // Limit each client to 200 requests per window
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "", // Use IP address as key
  }),
);

app.post(
  "/received-messages/:businessId",
  bootstrapMiddleware(),
  whatsappReservationHandler,
);

app.post("/test-ai/:businessId", bootstrapMiddleware(), testReservationHandler);

app.post("/semantic-ingestion/:businessId", semanticIngestionHandler);

app.post("/semantic-intents/core-domains", semanticIntent.coreDomainsHandler);

app.post("/semantic-intents/sub-domains", semanticIntent.subDomainsHandler);

app.get("/test-sentry-async-error", async (c) => {
  await Promise.reject(new Error("Second error"));
  return c.json({ message: "No debería llegar aquí" }, 500);
});

app.onError((error, c) => {
  const status: StatusCode =
    c.res.status >= 400 ? (c.res.status as ContentfulStatusCode) : 500;

  Sentry.captureException(error);
  return c.json(
    {
      error: error.message,
    },
    status,
  );
});

export default {
  port: env?.PORT ?? 3000,
  fetch: app.fetch,
  // external: ["@dbos-inc/dbos-sdk", "superjson"], // Bibliotecas externas
};
