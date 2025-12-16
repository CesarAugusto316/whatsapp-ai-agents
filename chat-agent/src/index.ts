import { Hono } from "hono";
import { cors } from "hono/cors";
import { aiAgentHandler } from "./handlers/ai-agent.handler";
import { aiAgentTestHandler } from "./handlers/ai-test.handler";

// AI SDK PROJECT EXAMPLE
// https://github.com/gopinav/Next.js-AI-Tutorials/tree/main/src/app/api
const app = new Hono();

app.use(
  cors({
    origin: ["*"],
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
  }),
);

app.post("/received-messages/:businessId", aiAgentHandler);
app.post("/test-ai", aiAgentTestHandler);

// export default app;
export default {
  port: 3000,
  fetch: app.fetch,
};
