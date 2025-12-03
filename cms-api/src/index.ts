import { Hono } from "hono";
import { handleEndpoints } from "payload";
const app = new Hono();
import { loadEnv } from "payload/node";
const { default: config } = await import("@payload-config");

loadEnv();

/**
 *
 * @description Bun runtime
 */
app.all("/api/*", (c) => {
  return handleEndpoints({
    config,
    request: c.req.raw, // Pasas la request cruda de Hono
  });
});

export default app;
