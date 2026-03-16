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

const BUSINESS_ID = env.BUSINESS_ID_TEST!;
const CUSTOMER_PHONE = "+3455555558";

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
});

/**
 * Tests para el Router Agent - Clasificación de intenciones
 *
 * El router debe clasificar correctamente los mensajes del usuario en:
 * - search_agent: Explorar, ver menú, buscar productos
 * - cart_agent: Gestionar pedido (agregar, quitar, modificar, confirmar)
 * - ask_clarification: Mensajes ambiguos sin contexto claro
 */
describe("Router Agent - Clasificación directa de intenciones", () => {
  beforeAll(() => {
    process.env.PORT = process.env.PORT || "3000";
  });

  beforeEach(async () => {
    // Limpiar historial de routing antes de cada test
    const orderKey = `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`;
    await cacheAdapter.delete(orderKey);
  });

  describe("Flujo básico - Primer mensaje sin historial", () => {
    test("debe retornar search_agent cuando usuario quiere ver el menú", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Quiero ver el menú");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("search_agent");
    }, 30_000);

    test("debe retornar search_agent cuando usuario pregunta qué hay", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("¿Qué tienen disponible?");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("search_agent");
    }, 30_000);

    test("debe retornar search_agent cuando usuario busca productos específicos", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Busco pizza margarita");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("search_agent");
    }, 30_000);

    test("debe retornar cart_agent cuando usuario quiere agregar producto", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Agrega una pizza margarita");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("cart_agent");
    }, 30_000);

    test("debe retornar cart_agent cuando usuario menciona cantidad de producto", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("2 pizzas pepperoni");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("cart_agent");
    }, 30_000);

    test("debe retornar ask_clarification cuando usuario dice producto sin contexto", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Pizza margarita");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("ask_clarification");
    }, 30_000);

    test("debe retornar cart_agent cuando usuario da su nombre", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Mi nombre es César");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("cart_agent");
    }, 30_000);
  });

  describe("Flujo con contexto - Historial de routing", () => {
    test("debe retornar cart_agent después de search_agent cuando usuario dice 'esa quiero'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Usuario explora (search_agent)
      const ctx1 = createCtx("¿Qué pizzas tienen?");
      const result1 = await routerAgent(ctx1, []);
      expect(result1).toBe("search_agent");

      // Paso 2: Usuario se refiere a lo visto (debería ir a cart_agent)
      const chatHistory: ChatMessage[] = [
        { role: "user", content: "¿Qué pizzas tienen?" },
        { role: "assistant", content: "Tenemos pizza margarita, pepperoni..." },
      ];
      const ctx2 = createCtx("Esa quiero");
      const result2 = await routerAgent(ctx2, chatHistory);

      expect(result2).toBe("cart_agent");
    }, 60_000);

    test("debe retornar cart_agent cuando usuario dice 'la quiero agregar' después de explorar", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Usuario explora
      const ctx1 = createCtx("Muéstrame el menú");
      const result1 = await routerAgent(ctx1, []);
      expect(result1).toBe("search_agent");

      // Paso 2: Usuario quiere agregar
      const chatHistory: ChatMessage[] = [
        { role: "user", content: "Muéstrame el menú" },
        { role: "assistant", content: "Aquí está el menú..." },
      ];
      const ctx2 = createCtx("La quiero agregar");
      const result2 = await routerAgent(ctx2, chatHistory);

      expect(result2).toBe("cart_agent");
    }, 60_000);

    test("debe retornar search_agent cuando usuario sigue explorando después de search_agent", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Usuario explora
      const ctx1 = createCtx("¿Qué hamburguesas tienen?");
      const result1 = await routerAgent(ctx1, []);
      expect(result1).toBe("search_agent");

      // Paso 2: Usuario sigue explorando (comparando)
      const chatHistory: ChatMessage[] = [
        { role: "user", content: "¿Qué hamburguesas tienen?" },
        { role: "assistant", content: "Tenemos clásica, cheeseburger..." },
      ];
      const ctx2 = createCtx("¿Cuál es más barata?");
      const result2 = await routerAgent(ctx2, chatHistory);

      expect(result2).toBe("search_agent");
    }, 60_000);

    test("debe retornar cart_agent cuando producto solo viene después de search_agent", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Usuario explora
      const ctx1 = createCtx("¿Qué pizzas tienen?");
      const result1 = await routerAgent(ctx1, []);
      expect(result1).toBe("search_agent");

      // Paso 2: Usuario menciona producto solo (debería ser cart_agent por contexto)
      // Usamos historial mínimo para evitar timeout de tokens
      const chatHistory: ChatMessage[] = [
        { role: "user", content: "¿Qué pizzas?" },
        { role: "assistant", content: "Margarita, Pepperoni" },
      ];
      const ctx2 = createCtx("Margarita");
      const result2 = await routerAgent(ctx2, chatHistory);

      // Después de search_agent, producto solo → cart_agent
      expect(result2).toBe("cart_agent");
    }, 30_000);
  });

  describe("Flujo de clarificación", () => {
    test("debe retornar search_agent cuando usuario responde 'ver' después de clarificación", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Mensaje ambiguo → ask_clarification
      const ctx1 = createCtx("Ensalada césar");
      const result1 = await routerAgent(ctx1, []);
      expect(result1).toBe("ask_clarification");

      // Paso 2: Usuario responde que quiere ver
      const chatHistory: ChatMessage[] = [
        { role: "user", content: "Ensalada césar" },
        {
          role: "assistant",
          content: "¿Quieres ver el menú o agregar al pedido?",
        },
      ];
      const ctx2 = createCtx("Ver");
      const result2 = await routerAgent(ctx2, chatHistory);

      expect(result2).toBe("search_agent");
    }, 60_000);

    test("debe retornar cart_agent cuando usuario responde 'agregar' después de clarificación", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Mensaje ambiguo → ask_clarification
      const ctx1 = createCtx("Pizza carbonara");
      const result1 = await routerAgent(ctx1, []);
      expect(result1).toBe("ask_clarification");

      // Paso 2: Usuario responde que quiere agregar
      const chatHistory: ChatMessage[] = [
        { role: "user", content: "Pizza carbonara" },
        {
          role: "assistant",
          content: "¿Quieres ver el menú o agregar al pedido?",
        },
      ];
      const ctx2 = createCtx("Agregar");
      const result2 = await routerAgent(ctx2, chatHistory);

      expect(result2).toBe("cart_agent");
    }, 60_000);

    test("debe retornar search_agent cuando usuario responde 'no sé' después de clarificación", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Mensaje ambiguo
      const ctx1 = createCtx("Tacos");
      const result1 = await routerAgent(ctx1, []);
      expect(result1).toBe("ask_clarification");

      // Paso 2: Usuario no está seguro → search_agent por defecto
      const chatHistory: ChatMessage[] = [
        { role: "user", content: "Tacos" },
        { role: "assistant", content: "¿Quieres ver el menú o agregar?" },
      ];
      const ctx2 = createCtx("No sé");
      const result2 = await routerAgent(ctx2, chatHistory);

      expect(result2).toBe("search_agent");
    }, 60_000);
  });

  describe("Prevención de loops de clarificación", () => {
    test("debe retornar search_agent después de 2 clarificaciones consecutivas", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Mensaje ambiguo → clarificación
      const ctx1 = createCtx("Tacos");
      await routerAgent(ctx1, []);

      // Paso 2: Usuario sigue ambiguo → segunda clarificación
      const chatHistory1: ChatMessage[] = [
        { role: "user", content: "Tacos" },
        { role: "assistant", content: "¿Ver o agregar?" },
      ];
      const ctx2 = createCtx("No sé");
      await routerAgent(ctx2, chatHistory1);

      // Paso 3: Router debe romper el loop → search_agent
      const chatHistory2: ChatMessage[] = [
        { role: "user", content: "Tacos" },
        { role: "assistant", content: "¿Ver o agregar?" },
        { role: "user", content: "No sé" },
        { role: "assistant", content: "¿Ver menú o agregar?" },
      ];
      const ctx3 = createCtx("Mmm...");
      const result3 = await routerAgent(ctx3, chatHistory2);

      // Debe romper el loop y enviar a search_agent
      expect(result3).toBe("search_agent");
    }, 90_000);
  });

  describe("Flujo completo de pedido", () => {
    test("debe manejar flujo: search_agent → cart_agent → cart_agent (modificaciones)", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      // Paso 1: Explorar menú
      const ctx1 = createCtx("¿Qué pizzas tienen?");
      const result1 = await routerAgent(ctx1, []);
      expect(result1).toBe("search_agent");

      // Paso 2: Agregar primera pizza
      const chatHistory1: ChatMessage[] = [
        { role: "user", content: "¿Qué pizzas tienen?" },
        { role: "assistant", content: "Margarita, Pepperoni..." },
      ];
      const ctx2 = createCtx("Agrega una pizza margarita");
      const result2 = await routerAgent(ctx2, chatHistory1);
      expect(result2).toBe("cart_agent");

      // Paso 3: Agregar otra pizza (modificación)
      const chatHistory2: ChatMessage[] = [
        { role: "user", content: "¿Qué pizzas tienen?" },
        { role: "assistant", content: "Margarita, Pepperoni..." },
        { role: "user", content: "Agrega una pizza margarita" },
        { role: "assistant", content: "Agregada" },
      ];
      const ctx3 = createCtx("También quiero una pepperoni");
      const result3 = await routerAgent(ctx3, chatHistory2);
      expect(result3).toBe("cart_agent");

      // Paso 4: Modificar pedido
      const chatHistory3: ChatMessage[] = [
        { role: "user", content: "¿Qué pizzas tienen?" },
        { role: "assistant", content: "Margarita, Pepperoni..." },
        { role: "user", content: "Agrega una pizza margarita" },
        { role: "assistant", content: "Agregada" },
        { role: "user", content: "También quiero una pepperoni" },
        { role: "assistant", content: "Agregada" },
      ];
      const ctx4 = createCtx("Cambia la margarita por hawaiana");
      const result4 = await routerAgent(ctx4, chatHistory3);
      expect(result4).toBe("cart_agent");
    }, 120_000);
  });

  describe("Patrones especiales de lenguaje", () => {
    test("debe retornar cart_agent con verbo implícito 'quiero 1...'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Quiero 1 ensalada césar");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("cart_agent");
    }, 30_000);

    test("debe retornar cart_agent con 'necesito 1...'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Necesito 2 hamburguesas");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("cart_agent");
    }, 30_000);

    test("debe retornar cart_agent con 'quitame...'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Quítame la pizza");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("cart_agent");
    }, 30_000);

    test("debe retornar cart_agent con 'muéstrame mi pedido'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Muéstrame mi pedido");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("cart_agent");
    }, 30_000);

    test("debe retornar cart_agent con 'quiero 2...'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Quiero 2 tacos");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("cart_agent");
    }, 30_000);

    test("debe retornar search_agent con 'busco...'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("Busco tacos al pastor");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("search_agent");
    }, 30_000);

    test("debe retornar search_agent con '¿qué ... tienen?'", async () => {
      await cacheAdapter.save(
        `product-order:${BUSINESS_ID}:${CUSTOMER_PHONE}`,
        { status: "ORDER_STARTED" },
        60 * 60,
      );

      const ctx = createCtx("¿Qué postres tienen?");
      const result = await routerAgent(ctx, []);

      expect(result).toBe("search_agent");
    }, 30_000);
  });
});
