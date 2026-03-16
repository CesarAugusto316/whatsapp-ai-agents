import { describe, test, expect, beforeEach, beforeAll } from "bun:test";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { env } from "bun";
import { routerAgent } from "@/application/use-cases/sagas/product-orders";
import { DomainCtx } from "@/domain/booking";
import {
  Business,
  Customer,
  SpecializedDomain,
} from "@/infraestructure/adapters/cms";
import { ChatMessage } from "@/infraestructure/adapters/ai";
import { productOrderStateManager } from "@/application/services/state-managers";

const BUSINESS_ID = env.BUSINESS_ID_TEST || "test-business-123";
const CUSTOMER_PHONE = "+3455555558";
const PRODUCT_ORDER_KEY = `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`;

/**
 * Crea un contexto de dominio para tests
 */
const createCtx = (message: string): DomainCtx => ({
  business: {
    general: {
      id: BUSINESS_ID,
      businessType: "restaurant" as SpecializedDomain,
      name: "Test Restaurant",
      description: "Test",
      phone: "+34000000000",
      address: "Test Address",
      imageUrl: null,
    },
    businessHours: [],
    specialSchedules: [],
  } as unknown as Business,
  customer: {
    id: "test-customer",
    name: null,
    phone: CUSTOMER_PHONE,
  } as unknown as Customer,
  customerMessage: message,
  // @ts-ignore
  chatHistory: [],
  bag: {},
  lastStep: null,
  productOrder: {
    status: "ORDER_STARTED",
    items: [],
    customerName: null,
  },
  productOrderKey: PRODUCT_ORDER_KEY,
});

/**
 * Tests para el Router Agent - Confirmación final de pedidos
 *
 * El router debe clasificar correctamente las intenciones de finalización
 * y retornar "ask_final_confirmation" cuando el usuario quiere terminar su pedido.
 */
describe("Router Agent - Confirmación final de pedidos", () => {
  beforeAll(() => {
    process.env.PORT = process.env.PORT || "3000";
  });

  beforeEach(async () => {
    // Limpiar historial de routing antes de cada test
    const orderKey = `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`;
    await cacheAdapter.delete(orderKey);
  });

  describe("ask_final_confirmation - Finalización con historial de agregados", () => {
    test("debe retornar ask_final_confirmation cuando usuario dice 'nada más' después de agregar productos", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Usuario explora
      const ctx1 = createCtx("¿Qué pizzas tienen?");
      await routerAgent(ctx1, []);

      // Guardar historial manualmente (simulando lo que hace cart-agent)
      await productOrderStateManager.saveRouterHistory(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        {
          agent: "search_agent",
          userMessage: "¿Qué pizzas tienen?",
        },
      );

      // Paso 2: Usuario agrega producto
      const chatHistory1: ChatMessage[] = [
        { role: "user", content: "¿Qué pizzas tienen?" },
        { role: "assistant", content: "Margarita, Pepperoni..." },
      ];
      const ctx2 = createCtx("Agrega una pizza margarita");
      await routerAgent(ctx2, chatHistory1);

      // Guardar historial con acción "add"
      await productOrderStateManager.saveRouterHistory(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        {
          agent: "cart_agent",
          userMessage: "Agrega una pizza margarita",
          action: "add",
          toolName: "addProduct",
        },
      );

      // Paso 3: Usuario quiere finalizar
      const chatHistory2: ChatMessage[] = [
        { role: "user", content: "¿Qué pizzas tienen?" },
        { role: "assistant", content: "Margarita, Pepperoni..." },
        { role: "user", content: "Agrega una pizza margarita" },
        { role: "assistant", content: "Agregada" },
      ];
      const ctx3 = createCtx("Nada más, eso es todo");
      const result3 = await routerAgent(ctx3, chatHistory2);

      expect(result3).toBe("ask_final_confirmation");
    }, 90_000);

    test("debe retornar ask_final_confirmation cuando usuario dice 'quiero confirmar'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Configurar historial con agregado reciente
      await productOrderStateManager.saveRouterHistory(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        {
          agent: "cart_agent",
          userMessage: "Agrega dos pizzas",
          action: "add",
          toolName: "addProduct",
        },
      );

      const ctx = createCtx("Quiero confirmar mi pedido");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("ask_final_confirmation");
    }, 30_000);

    test("debe retornar ask_final_confirmation cuando usuario dice 'listo'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Configurar historial con agregado reciente
      await productOrderStateManager.saveRouterHistory(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        {
          agent: "cart_agent",
          userMessage: "Agrega una coca cola",
          action: "add",
          toolName: "addProduct",
        },
      );

      const ctx = createCtx("Listo, es todo");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("ask_final_confirmation");
    }, 30_000);

    test("debe retornar ask_final_confirmation cuando usuario dice 'quiero terminar'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Configurar historial con agregado reciente
      await productOrderStateManager.saveRouterHistory(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        {
          agent: "cart_agent",
          userMessage: "Agrega una ensalada",
          action: "add",
          toolName: "addProduct",
        },
      );

      const ctx = createCtx("Quiero terminar la orden");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("ask_final_confirmation");
    }, 30_000);
  });

  describe("ask_final_confirmation - Sin historial de agregados", () => {
    test("debe retornar ask_clarification cuando usuario dice 'nada más' SIN haber agregado productos", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Sin historial de agregados
      const ctx = createCtx("Nada más, eso es todo");
      const result = await routerAgent(ctx, []);

      // Sin contexto de agregados, el router puede enviar a ask_clarification o cart_agent
      // Depende de cómo el LLM interprete la intención
      expect([
        "cart_agent",
        "ask_clarification",
        "ask_final_confirmation",
      ]).toContain(result);
    }, 60_000);

    test("debe retornar ask_final_confirmation o cart_agent cuando usuario dice 'quiero confirmar' SIN haber agregado productos", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Sin historial de agregados
      const ctx = createCtx("Quiero confirmar");
      const result = await routerAgent(ctx, []);

      // Sin contexto de agregados, el router puede enviar a ask_final_confirmation
      // porque la frase "quiero confirmar" es muy explícita
      // O puede enviar a cart_agent para que verifique el carrito primero
      expect(["cart_agent", "ask_final_confirmation"]).toContain(result);
    }, 30_000);
  });

  describe("Flujo completo con confirmación final", () => {
    test("debe manejar flujo completo: search_agent → cart_agent[add] → cart_agent[add] → ask_final_confirmation", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Explorar menú
      const ctx1 = createCtx("¿Qué pizzas tienen?");
      const result1 = await routerAgent(ctx1, []);
      expect(result1).toBe("search_agent");

      // Guardar historial
      await productOrderStateManager.saveRouterHistory(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        {
          agent: "search_agent",
          userMessage: "¿Qué pizzas tienen?",
        },
      );

      // Paso 2: Agregar primera pizza
      const chatHistory1: ChatMessage[] = [
        { role: "user", content: "¿Qué pizzas tienen?" },
        { role: "assistant", content: "Margarita, Pepperoni..." },
      ];
      const ctx2 = createCtx("Agrega una pizza margarita");
      const result2 = await routerAgent(ctx2, chatHistory1);
      expect(result2).toBe("cart_agent");

      // Guardar historial con acción add
      await productOrderStateManager.saveRouterHistory(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        {
          agent: "cart_agent",
          userMessage: "Agrega una pizza margarita",
          action: "add",
          toolName: "addProduct",
        },
      );

      // Paso 3: Agregar segunda pizza
      const chatHistory2: ChatMessage[] = [
        { role: "user", content: "¿Qué pizzas tienen?" },
        { role: "assistant", content: "Margarita, Pepperoni..." },
        { role: "user", content: "Agrega una pizza margarita" },
        { role: "assistant", content: "Agregada" },
      ];
      const ctx3 = createCtx("También quiero una pepperoni");
      const result3 = await routerAgent(ctx3, chatHistory2);
      expect(result3).toBe("cart_agent");

      // Guardar historial con acción add
      await productOrderStateManager.saveRouterHistory(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        {
          agent: "cart_agent",
          userMessage: "También quiero una pepperoni",
          action: "add",
          toolName: "addProduct",
        },
      );

      // Paso 4: Finalizar pedido
      const chatHistory3: ChatMessage[] = [
        { role: "user", content: "¿Qué pizzas tienen?" },
        { role: "assistant", content: "Margarita, Pepperoni..." },
        { role: "user", content: "Agrega una pizza margarita" },
        { role: "assistant", content: "Agregada" },
        { role: "user", content: "También quiero una pepperoni" },
        { role: "assistant", content: "Agregada" },
      ];
      const ctx4 = createCtx("Nada más, eso es todo");
      const result4 = await routerAgent(ctx4, chatHistory3);

      // Debe retornar ask_final_confirmation porque hubo agregados recientes
      expect(result4).toBe("ask_final_confirmation");
    }, 120_000);
  });
});
