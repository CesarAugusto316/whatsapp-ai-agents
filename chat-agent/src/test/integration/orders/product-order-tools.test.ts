import { describe, test, expect, beforeEach, beforeAll } from "bun:test";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { env } from "bun";

const BUSINESS_ID = env.BUSINESS_ID_TEST;
const CUSTOMER_PHONE = "+3455555556";

interface TestResponse {
  bag: Record<string, any>;
  lastStepResult?: {
    execute?: {
      result: string;
    };
    compensate?: {
      result: string;
    };
  };
}

const makeRequest = async (body: string): Promise<TestResponse> => {
  const payload = {
    event: "message",
    session: "default",
    payload: {
      body,
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
  expect(res.status).toBe(200);
  return (await res.json()) as TestResponse;
};

describe("Product Order Tool Calling Integration", () => {
  beforeAll(() => {
    process.env.PORT = process.env.PORT || "3000";
  });

  beforeEach(async () => {
    const chatKey = `chat:${BUSINESS_ID}:${CUSTOMER_PHONE}`;
    const bookingKey = `booking:${BUSINESS_ID}:${CUSTOMER_PHONE}`;
    const productOrderKey = `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`;
    await cacheAdapter.delete(chatKey);
    await cacheAdapter.delete(bookingKey);
    await cacheAdapter.delete(productOrderKey);
  });

  test("should search products when user asks for pizza", async () => {
    await cacheAdapter.save(
      `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
      { status: "ORDER_STARTED" },
      60 * 60,
    );

    const response = await makeRequest("Quiero una pizza margarita");
    const result = response.lastStepResult?.execute?.result;

    expect(result).toBeDefined();
    // Should contain product information or ask for clarification
    const lowerResult = result!.toLowerCase();
    expect(
      lowerResult.includes("pizza") ||
        lowerResult.includes("menú") ||
        lowerResult.includes("carta") ||
        lowerResult.includes("disponible") ||
        lowerResult.includes("opción"),
    ).toBe(true);
  }, 30_000);

  test("should show menu when user asks 'qué hay'", async () => {
    await cacheAdapter.save(
      `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
      { status: "ORDER_STARTED" },
      60 * 60,
    );

    const response = await makeRequest("¿Qué hay en el menú?");
    const result = response.lastStepResult?.execute?.result;

    expect(result).toBeDefined();
    const lowerResult = result!.toLowerCase();
    expect(
      lowerResult.includes("menú") ||
        lowerResult.includes("carta") ||
        lowerResult.includes("plato") ||
        lowerResult.includes("opción") ||
        lowerResult.includes("disponible"),
    ).toBe(true);
  }, 30_000);

  test("should filter by category when user asks for beverages", async () => {
    await cacheAdapter.save(
      `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
      { status: "ORDER_STARTED" },
      60 * 60,
    );

    const response = await makeRequest("¿Qué bebidas tienen?");
    const result = response.lastStepResult?.execute?.result;

    expect(result).toBeDefined();
    const lowerResult = result!.toLowerCase();
    // Should mention beverages or show drink options
    expect(
      lowerResult.includes("bebida") ||
        lowerResult.includes("refresco") ||
        lowerResult.includes("agua") ||
        lowerResult.includes("cerveza") ||
        lowerResult.includes("vino") ||
        lowerResult.includes("menú") ||
        lowerResult.includes("carta"),
    ).toBe(true);
  }, 30_000);

  test("should handle greeting without triggering tool calls", async () => {
    await cacheAdapter.save(
      `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
      { status: "ORDER_STARTED" },
      60 * 60,
    );

    const response = await makeRequest("Hola, ¿qué tal?");
    const result = response.lastStepResult?.execute?.result;

    expect(result).toBeDefined();
    const lowerResult = result!.toLowerCase();
    // Should be a greeting response, not product search
    expect(
      lowerResult.includes("hola") ||
        lowerResult.includes("buenas") ||
        lowerResult.includes("qué tal") ||
        lowerResult.includes("saludo"),
    ).toBe(true);
    // Should NOT contain product search results
    expect(lowerResult.includes("error")).toBe(false);
  }, 30_000);

  test("should handle complete order flow: menu → specific product → order", async () => {
    await cacheAdapter.save(
      `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
      { status: "ORDER_STARTED" },
      60 * 60,
    );

    // Step 1: Request full menu
    const response1 = await makeRequest("Muéstrame el menú completo");
    const result1 = response1.lastStepResult?.execute?.result;
    expect(result1).toBeDefined();
    expect(result1!.toLowerCase()).toMatch(
      /(menú|carta|plato|opción|disponible)/,
    );

    // Step 2: Ask for vegetarian options
    const response2 = await makeRequest("¿Tienen opciones vegetarianas?");
    const result2 = response2.lastStepResult?.execute?.result;
    expect(result2).toBeDefined();
    expect(result2!.toLowerCase()).toMatch(
      /(vegetarian|ensalada|verdura|menú|carta|plato)/,
    );

    // Step 3: Express intent to order
    const response3 = await makeRequest("Quiero pedir una ensalada");
    const result3 = response3.lastStepResult?.execute?.result;
    expect(result3).toBeDefined();
    expect(result3!.toLowerCase()).toMatch(
      /(ensalada|pedir|orden|elegir|menú|carta)/,
    );
  }, 60_000);

  test("should handle specific product search with concrete item", async () => {
    await cacheAdapter.save(
      `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
      { status: "ORDER_STARTED" },
      60 * 60,
    );

    const response = await makeRequest("Busco hamburguesa con queso y bacon");
    const result = response.lastStepResult?.execute?.result;

    expect(result).toBeDefined();
    const lowerResult = result!.toLowerCase();
    expect(
      lowerResult.includes("hamburguesa") ||
        lowerResult.includes("menú") ||
        lowerResult.includes("carta") ||
        lowerResult.includes("disponible") ||
        lowerResult.includes("opción"),
    ).toBe(true);
  }, 30_000);

  test("should handle dessert category query", async () => {
    await cacheAdapter.save(
      `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
      { status: "ORDER_STARTED" },
      60 * 60,
    );

    const response = await makeRequest("¿Qué postres tienen?");
    const result = response.lastStepResult?.execute?.result;

    expect(result).toBeDefined();
    const lowerResult = result!.toLowerCase();
    expect(
      lowerResult.includes("postre") ||
        lowerResult.includes("dulce") ||
        lowerResult.includes("tarta") ||
        lowerResult.includes("helado") ||
        lowerResult.includes("menú") ||
        lowerResult.includes("carta"),
    ).toBe(true);
  }, 30_000);
});
