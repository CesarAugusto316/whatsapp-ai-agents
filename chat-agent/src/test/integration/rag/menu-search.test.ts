import { describe, test, expect } from "bun:test";
import { executeTool } from "@/infraestructure/adapters/ai/tool-executor";
import { env } from "bun";

// Use the actual business ID that has menu data in Qdrant
const BUSINESS_ID = env.BUSINESS_ID_TEST!;

describe("executeTool - get_menu", () => {
  test("should find menu with intent 'menu'", async () => {
    const result = await executeTool(
      "get_menu",
      { intent: "menu" },
      BUSINESS_ID,
    );
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty("menuItems");
    expect(Array.isArray(parsed.menuItems)).toBe(true);
    console.log("Result for 'menu':", parsed);
  });

  test("should find menu with intent 'quiero ver el menu'", async () => {
    const result = await executeTool(
      "get_menu",
      { intent: "quiero ver el menu" },
      BUSINESS_ID,
    );
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty("menuItems");
    expect(Array.isArray(parsed.menuItems)).toBe(true);
    console.log("Result for 'quiero ver el menu':", parsed);
  });

  test("should find menu with intent 'quiero ver el menú'", async () => {
    const result = await executeTool(
      "get_menu",
      { intent: "quiero ver el menú" },
      BUSINESS_ID,
    );
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty("menuItems");
    expect(Array.isArray(parsed.menuItems)).toBe(true);
    console.log("Result for 'quiero ver el menú':", parsed);
  });

  test("should find menu with intent 'muéstrame el menú'", async () => {
    const result = await executeTool(
      "get_menu",
      { intent: "muéstrame el menú" },
      BUSINESS_ID,
    );
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty("menuItems");
    expect(Array.isArray(parsed.menuItems)).toBe(true);
    console.log("Result for 'muéstrame el menú':", parsed);
  });

  test("should find menu with intent 'la carta por favor'", async () => {
    const result = await executeTool(
      "get_menu",
      { intent: "la carta por favor" },
      BUSINESS_ID,
    );
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty("menuItems");
    expect(Array.isArray(parsed.menuItems)).toBe(true);
    console.log("Result for 'la carta por favor':", parsed);
  });

  test("should find menu with undefined intent (fallback to 'menu')", async () => {
    const result = await executeTool("get_menu", {}, BUSINESS_ID);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty("menuItems");
    expect(Array.isArray(parsed.menuItems)).toBe(true);
    console.log("Result for undefined intent (fallback):", parsed);
  });
});
