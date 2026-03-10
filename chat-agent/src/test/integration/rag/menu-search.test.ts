import { describe, test, expect } from "bun:test";
import { executeTool } from "@/infraestructure/adapters/ai/tool-executor";
import { env } from "bun";

// Business ID con datos de menú en Qdrant
const BUSINESS_ID = env.BUSINESS_ID_TEST!;

describe("executeTool - get_menu", () => {
  test("should find menu with intent 'menu'", async () => {
    const result = await executeTool(
      "get_menu",
      { intent: "menu" },
      BUSINESS_ID,
    );

    expect(result.success).toBe(true);
    expect(result.tool).toBe("get_menu");
    expect(result.files).toBeDefined();
    expect(Array.isArray(result.files)).toBe(true);

    if (result.files.length > 0) {
      expect(result.files[0]).toHaveProperty("url");
      expect(result.files[0]).toHaveProperty("filename");
      expect(result.files[0]).toHaveProperty("mimetype");
      expect(result.files[0]).toHaveProperty("alt");
    }
    console.log("Result for 'menu':", result);
  });

  test("should find menu with intent 'quiero ver el menu'", async () => {
    const result = await executeTool(
      "get_menu",
      { intent: "quiero ver el menu" },
      BUSINESS_ID,
    );

    expect(result.success).toBe(true);
    expect(result.tool).toBe("get_menu");
    expect(result.files).toBeDefined();
    expect(Array.isArray(result.files)).toBe(true);

    if (result.files.length > 0) {
      expect(result.files[0]).toHaveProperty("url");
      expect(result.files[0]).toHaveProperty("filename");
      expect(result.files[0]).toHaveProperty("mimetype");
      expect(result.files[0]).toHaveProperty("alt");
    }
    console.log("Result for 'quiero ver el menu':", result);
  });

  test("should find menu with intent 'quiero ver el menú'", async () => {
    const result = await executeTool(
      "get_menu",
      { intent: "quiero ver el menú" },
      BUSINESS_ID,
    );

    expect(result.success).toBe(true);
    expect(result.tool).toBe("get_menu");
    expect(result.files).toBeDefined();
    expect(Array.isArray(result.files)).toBe(true);

    if (result.files.length > 0) {
      expect(result.files[0]).toHaveProperty("url");
      expect(result.files[0]).toHaveProperty("filename");
      expect(result.files[0]).toHaveProperty("mimetype");
      expect(result.files[0]).toHaveProperty("alt");
    }
    console.log("Result for 'quiero ver el menú':", result);
  });

  test("should find menu with intent 'muéstrame el menú'", async () => {
    const result = await executeTool(
      "get_menu",
      { intent: "muéstrame el menú" },
      BUSINESS_ID,
    );

    expect(result.success).toBe(true);
    expect(result.tool).toBe("get_menu");
    expect(result.files).toBeDefined();
    expect(Array.isArray(result.files)).toBe(true);

    if (result.files.length > 0) {
      expect(result.files[0]).toHaveProperty("url");
      expect(result.files[0]).toHaveProperty("filename");
      expect(result.files[0]).toHaveProperty("mimetype");
      expect(result.files[0]).toHaveProperty("alt");
    }
    console.log("Result for 'muéstrame el menú':", result);
  });

  test("should find menu with intent 'la carta por favor'", async () => {
    const result = await executeTool(
      "get_menu",
      { intent: "la carta por favor" },
      BUSINESS_ID,
    );

    expect(result.success).toBe(true);
    expect(result.tool).toBe("get_menu");
    expect(result.files).toBeDefined();
    expect(Array.isArray(result.files)).toBe(true);

    if (result.files.length > 0) {
      expect(result.files[0]).toHaveProperty("url");
      expect(result.files[0]).toHaveProperty("filename");
      expect(result.files[0]).toHaveProperty("mimetype");
      expect(result.files[0]).toHaveProperty("alt");
    }
    console.log("Result for 'la carta por favor':", result);
  });

  test("should find menu with undefined intent (fallback to 'menu')", async () => {
    const result = await executeTool("get_menu", {}, BUSINESS_ID);

    expect(result.success).toBe(true);
    expect(result.tool).toBe("get_menu");
    expect(result.files).toBeDefined();
    expect(Array.isArray(result.files)).toBe(true);

    if (result.files.length > 0) {
      expect(result.files[0]).toHaveProperty("url");
      expect(result.files[0]).toHaveProperty("filename");
      expect(result.files[0]).toHaveProperty("mimetype");
      expect(result.files[0]).toHaveProperty("alt");
    }
    console.log("Result for undefined intent (fallback):", result);
  });
});
