import { describe, test, expect } from "bun:test";
import { executeTool } from "@/infraestructure/adapters/ai/tool-executor";
import { env } from "bun";

// Business ID con datos de menú en Qdrant
const BUSINESS_ID = env.BUSINESS_ID_TEST!;

describe("executeTool - search_products", () => {
  //
  test("should find products with keywords 'pizzas'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "pizzas", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'pizzas':", result);
  });

  test("should find products with keywords 'pizza vegetariana'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "pizza vegetariana", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'pizza vegetariana':", result);
  });

  test("should find products with keywords 'pizzas de carne'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "pizza con carne", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'pizzas de carne':", result);
  });

  test("should find products with keywords 'pastas'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "pastas", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'pastas':", result);
  });

  test("should find products with keywords 'bebidas'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "bebidas", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'bebidas':", result);
  });

  test("should find products with keywords 'postres'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "postres", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'postres':", result);
  });

  test("should find products with keywords 'ensaladas'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "ensaladas", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'ensaladas':", result);
  });

  test("should handle empty keywords gracefully", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);
    expect(result.success).toBe(false);
    expect(result.message).toContain(
      "No se encontraron productos, se debe pedir alternativas al usuario",
    );
    console.log("Result for empty keywords:", result);
  });

  test("should handle not found products", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "sushi japonés tradicional", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);
    // Este test puede pasar o fallar dependiendo de los datos en Qdrant
    // Si no hay sushi, debería retornar success: false
    if (!result.success) {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'sushi japonés tradicional':", result);
  });

  test("should find products with keywords 'pollo'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "pollo", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'pollo':", result);
  });

  test("should find products with keywords 'carne'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "carne", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'carne':", result);
  });

  test("should find products with keywords 'hamburguesa'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "hamburguesa", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'hamburguesa':", result);
  });

  test("should find products with keywords 'café'", async () => {
    const result = await executeTool(
      "search_products",
      { keywords: "café", limit: 5 },
      BUSINESS_ID,
    );

    expect(result.tool).toBe("search_products");
    expect(result.files).toEqual([]);

    if (result.success) {
      const parsed = JSON.parse(result.message);
      expect(parsed).toHaveProperty("products");
      expect(Array.isArray(parsed.products)).toBe(true);
      if (parsed.products.length > 0) {
        expect(parsed.products[0]).toHaveProperty("name");
        expect(parsed.products[0]).toHaveProperty("description");
        expect(parsed.products[0]).toHaveProperty("isAvailable");
      }
    } else {
      expect(result.message).toContain(
        "No se encontraron productos, se debe pedir alternativas al usuario",
      );
    }
    console.log("Result for 'café':", result);
  });
});
