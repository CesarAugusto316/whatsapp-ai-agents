import { handleEndpoints } from "payload";
import { loadEnv } from "payload/node";
import { serve } from "@hono/node-server";
const { default: config } = await import("@payload-config");

loadEnv();
const port = 3001;

/**
 *
 * @description Nodejs runtime
 */
const server = serve({
  fetch: async (request) => {
    const response = await handleEndpoints({
      config,
      request: request.clone(),
    });
    return response;
  },
  port,
});

server.on("listening", () => {
  console.log(`API server is listening on http://localhost:${port}/api`);
});
