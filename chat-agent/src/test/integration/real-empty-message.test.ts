import { describe, test, expect, beforeEach, beforeAll } from "bun:test";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { env } from "bun";

// Constants from the logs
const BUSINESS_ID = env.BUSINESS_ID_TEST;
const CUSTOMER_PHONE = "+3455555555";

describe("Real integration: Empty message error", () => {
  beforeAll(() => {
    process.env.PORT = process.env.PORT || "3000";
  });

  beforeEach(async () => {
    // Clean up Redis keys for this business and customer before each test
    const chatKey = `chat:${BUSINESS_ID}:${CUSTOMER_PHONE}`;
    const bookingKey = `booking:${BUSINESS_ID}:${CUSTOMER_PHONE}`;
    await cacheAdapter.delete(chatKey);
    await cacheAdapter.delete(bookingKey);
  });

  test(
    "should return 400 when message is empty",
    async () => {
      const payload = {
        event: "message",
        session: "default",
        payload: {
          body: "", // Empty message
          from: CUSTOMER_PHONE,
        },
      };

      const req = new Request(`http://localhost:3000/test-ai/${BUSINESS_ID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await fetch(req);
      expect(res.status).toBe(400);

      const responseBody = await res.json();
      expect(responseBody).toEqual({ error: "Customer message not received" });
    },
    60_000 * 3,
  );
});
