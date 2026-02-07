import { describe, test, expect, beforeEach, beforeAll } from "bun:test";
import { cacheAdapter } from "@/infraestructure/adapters/cache";

describe("Real integration: Business not found error", () => {
  beforeAll(() => {
    process.env.PORT = process.env.PORT || "3000";
  });

  beforeEach(async () => {
    // Clean up Redis keys for the test business ID
    const customerPhone = "+3455555555";
    const businessId = "non-existent-business-id-12345";
    const chatKey = `chat:${businessId}:${customerPhone}`;
    const bookingKey = `booking:${businessId}:${customerPhone}`;
    await cacheAdapter.delete(chatKey);
    await cacheAdapter.delete(bookingKey);
  });

  test(
    "should return 404 when business does not exist",
    async () => {
      const businessId = "non-existent-business-id-12345";
      const customerPhone = "+3455555555";
      const payload = {
        payload: {
          body: "hola",
          from: customerPhone,
        },
      };

      const req = new Request(`http://localhost:3000/test-ai/${businessId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await fetch(req);
      expect(res.status).toBe(500);

      const responseBody = await res.json();
      console.log({ responseBody });
      expect(responseBody).toEqual({ error: "Error 404: Not Found" });
    },
    60_000 * 3,
  );
});
