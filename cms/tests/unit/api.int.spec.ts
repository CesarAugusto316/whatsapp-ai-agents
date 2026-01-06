import { getPayload, Payload } from "payload";
import config from "@/payload.config";

import { describe, it, beforeAll, expect } from "bun:test";

let payload: Payload;

describe("API", () => {
  beforeAll(async () => {
    const payloadConfig = await config;
    payload = await getPayload({ config: payloadConfig });
  });

  it("fetches users", async () => {
    const users = await payload.find({
      collection: "users",
    });
    expect(users).toBeDefined();
  });
});
