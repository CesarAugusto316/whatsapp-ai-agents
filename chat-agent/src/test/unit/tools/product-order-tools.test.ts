import { describe, test, expect } from "bun:test";

describe("handleProductOrderWithTools", () => {
  test("should exist and be a function", () => {
    const {
      handleProductOrderWithTools,
    } = require("@/infraestructure/adapters/ai/tool-executor");
    expect(typeof handleProductOrderWithTools).toBe("function");
  });
});
