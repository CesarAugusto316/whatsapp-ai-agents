import { test, expect, describe } from "bun:test";
import { intentClassifierPrompt } from "@/domain/booking/prompts/intent-classifier-prompt";
import type {
  PolicyDecision,
  BeliefIntent,
} from "@/application/services/pomdp";
import type { RestaurantCtx } from "@/domain/restaurant";

// ============================================
// HELPERS PARA CREAR TEST DATA
// ============================================

const createMockCtx = (overrides?: Partial<RestaurantCtx>): RestaurantCtx =>
  ({
    customerMessage: "",
    beliefKey: "test-belief-key",
    businessId: "test-business",
    business: {
      name: "Test Restaurant",
      businessType: "Restaurante",
      assistantName: "TestBot",
      general: {
        businessType: "Restaurante",
        name: "Test Restaurant",
        description: "Test",
        timezone: "America/Mexico_City",
      },
      contact: {
        phone: "",
        email: "",
        address: {
          street: "Calle Test",
          city: "CDMX",
          state: "CDMX",
          country: "México",
          postalCode: "00000",
        },
      },
      schedule: {
        monday: { open: "12:00", close: "23:00" },
        tuesday: { open: "12:00", close: "23:00" },
        wednesday: { open: "12:00", close: "23:00" },
        thursday: { open: "12:00", close: "23:00" },
        friday: { open: "12:00", close: "23:00" },
        saturday: { open: "12:00", close: "23:00" },
        sunday: { open: "12:00", close: "23:00" },
      },
    },
    activeModules: ["booking", "restaurant", "informational"],
    beliefState: undefined,
    ...overrides,
  }) as RestaurantCtx;

const createBeliefIntent = (
  intentKey: string,
  module: string,
  overrides?: Partial<BeliefIntent>,
): BeliefIntent => ({
  text: "",
  score: 0.9,
  alternatives: [],
  intentKey: intentKey as any,
  module: module as any,
  requiresConfirmation: "always",
  signals: {
    isConfirmed: false,
    isRejected: false,
    isUncertain: false,
  },
  isConfident: true,
  ...overrides,
});

const createPolicy = (
  type: PolicyDecision["type"],
  intent: BeliefIntent | undefined,
  state?: any,
): PolicyDecision => {
  const baseState = {
    executedIntents: [],
    current: intent,
    previous: undefined,
    lastUpdate: Date.now(),
    isIntentFound: !!intent,
    ...state,
  };

  switch (type) {
    case "unknown_intent":
      return { type: "unknown_intent", intent: undefined, state: baseState };
    case "ask_clarification":
    case "clear_up_uncertainty":
    case "ask_confirmation":
    case "propose_alternative":
      return { type, intent: intent!, state: baseState };
    case "execute":
      return {
        type,
        intent: intent!,
        action: intent!.intentKey,
        state: baseState,
      };
    default:
      throw new Error(`Unknown policy type: ${type}`);
  }
};

// ============================================
// TESTS: unknown_intent
// ============================================

describe("intentClassifierPrompt - unknown_intent", () => {
  test("debe generar prompt para unknown_intent con todos los módulos activos", () => {
    const ctx = createMockCtx();
    const policy = createPolicy("unknown_intent", undefined);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("POLICY DECISION: unknown_intent");
    expect(prompt).toContain("booking, restaurant, informational");
    expect(prompt).toContain("BOOKING (Reservas de mesa)");
    expect(prompt).toContain("PRODUCT ORDERS (Pedidos de comida)");
    expect(prompt).toContain("INFORMATIONAL");
    expect(prompt).toContain('NO digas "no entendí"');
    expect(prompt).toContain("TestBot");
    expect(prompt).toContain("Test Restaurant");
  });

  test("debe generar prompt para unknown_intent solo con booking activo", () => {
    const ctx = createMockCtx({ activeModules: ["booking"] });
    const policy = createPolicy("unknown_intent", undefined);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("BOOKING (Reservas de mesa)");
    expect(prompt).not.toContain("PRODUCT ORDERS");
    expect(prompt).not.toContain("INFORMATIONAL");
  });

  test("debe generar prompt para unknown_intent solo con restaurant activo", () => {
    const ctx = createMockCtx({ activeModules: ["products", "orders"] });
    const policy = createPolicy("unknown_intent", undefined);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("PRODUCT ORDERS (Pedidos de comida)");
    expect(prompt).not.toContain("BOOKING (Reservas de mesa)");
  });

  test("debe generar prompt para unknown_intent solo con informational activo", () => {
    const ctx = createMockCtx({ activeModules: ["informational"] });
    const policy = createPolicy("unknown_intent", undefined);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("INFORMATIONAL");
    expect(prompt).toContain("Horarios");
    expect(prompt).toContain("Ubicación");
    expect(prompt).toContain("Pago");
    expect(prompt).toContain("Entrega");
  });
});

// ============================================
// TESTS: ask_clarification
// ============================================

describe("intentClassifierPrompt - ask_clarification", () => {
  test("debe generar prompt para ask_clarification con alternativas del mismo módulo", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_clarification", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("POLICY DECISION: ask_clarification");
    expect(prompt).toContain("booking:create");
    expect(prompt).toContain("booking:modify");
    expect(prompt).toContain("excluyendo intentKey actual");
    expect(prompt).toContain("0.75");
  });

  test("debe generar prompt para ask_clarification con alternativas de diferente módulo", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "orders:create",
        module: "products",
        score: 0.7,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_clarification", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("booking:create");
    expect(prompt).toContain("orders:create");
    expect(prompt).toContain("restaurant");
  });

  test("debe generar prompt para ask_clarification sin alternativas", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives: [],
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_clarification", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("No hay alternativas en BeliefState");
  });

  test("debe filtrar la intentKey actual de las alternativas", () => {
    // La alternativa con la misma intentKey debe ser filtrada
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:create", // Misma intentKey - debe ser filtrada
        module: "booking",
        score: 0.8,
        text: "",
        requiresConfirmation: "always",
      },
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_clarification", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    // booking:create NO debe aparecer en las alternativas listadas
    expect(prompt).toContain("booking:modify");
    expect(prompt).not.toContain("1. booking:create");
  });

  test("debe usar filteredAlts en los ejemplos del prompt", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
      {
        intentKey: "booking:cancel",
        module: "booking",
        score: 0.7,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_clarification", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("Modificar reserva");
    expect(prompt).toContain("Cancelar reserva");
  });
});

// ============================================
// TESTS: clear_up_uncertainty
// ============================================

describe("intentClassifierPrompt - clear_up_uncertainty", () => {
  test("debe generar prompt para clear_up_uncertainty con alternativas", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
      {
        intentKey: "products:find",
        module: "products",
        score: 0.7,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
      signals: { isConfirmed: false, isRejected: false, isUncertain: true },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("clear_up_uncertainty", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("POLICY DECISION: clear_up_uncertainty");
    expect(prompt).toContain("isUncertain=true");
    expect(prompt).toContain(
      "NO ofrezcas la intención actual que está dudando",
    );
    expect(prompt).toContain("NO uses intentKey");
  });

  test("NO debe incluir la intentKey actual en las opciones", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
      signals: { isConfirmed: false, isRejected: false, isUncertain: true },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("clear_up_uncertainty", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    // La intentKey actual (booking:create) NO debe estar en las opciones
    expect(prompt).toContain("Opción A");
    expect(prompt).toContain("Opción B");
    expect(prompt).toContain("Modificar reserva");
  });

  test("debe usar fallback cuando no hay alternativas", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives: [],
      signals: { isConfirmed: false, isRejected: false, isUncertain: true },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("clear_up_uncertainty", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("No hay alternativas");
    expect(prompt).toContain("ver el menú");
    expect(prompt).toContain("hacer un pedido");
  });

  test("debe filtrar alternativas que coinciden con intentKey", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:create", // Misma intentKey - debe ser filtrada
        module: "booking",
        score: 0.8,
        text: "",
        requiresConfirmation: "always",
      },
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
      signals: { isConfirmed: false, isRejected: false, isUncertain: true },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("clear_up_uncertainty", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    // Solo booking:modify debe aparecer
    expect(prompt).toContain("booking:modify");
    expect(prompt).not.toContain("1. booking:create");
  });
});

// ============================================
// TESTS: ask_confirmation
// ============================================

describe("intentClassifierPrompt - ask_confirmation", () => {
  test("debe generar prompt para ask_confirmation con booking", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      requiresConfirmation: "always",
      signals: { isConfirmed: false, isRejected: false, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_confirmation", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("POLICY DECISION: ask_confirmation");
    expect(prompt).toContain("booking:create");
    expect(prompt).toContain("Crear reserva");
    expect(prompt).toContain("✅");
    expect(prompt).toContain('NO uses "¿Estás seguro?"');
  });

  test("debe generar prompt para ask_confirmation con restaurant", () => {
    const intent = createBeliefIntent("orders:create", "products", {
      requiresConfirmation: "always",
      signals: { isConfirmed: false, isRejected: false, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_confirmation", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("orders:create");
    expect(prompt).toContain("Hacer pedido");
    expect(prompt).toContain("PRODUCT ORDERS");
  });

  test("debe incluir ejemplos específicos por módulo", () => {
    const intent = createBeliefIntent("booking:cancel", "booking", {
      requiresConfirmation: "always",
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_confirmation", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("BOOKING:");
    expect(prompt).toContain("booking:create");
    expect(prompt).toContain("booking:modify");
    expect(prompt).toContain("booking:cancel");
  });

  test("debe mostrar requiresConfirmation del intent", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      requiresConfirmation: "always",
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_confirmation", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain('requiresConfirmation: "always"');
  });
});

// ============================================
// TESTS: propose_alternative
// ============================================

describe("intentClassifierPrompt - propose_alternative", () => {
  test("debe generar prompt para propose_alternative con alternativas del mismo módulo", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
      {
        intentKey: "booking:cancel",
        module: "booking",
        score: 0.7,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
      signals: { isConfirmed: false, isRejected: true, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("propose_alternative", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("POLICY DECISION: propose_alternative");
    expect(prompt).toContain("isRejected=true");
    expect(prompt).toContain("ALTERNATIVAS DEL MISMO MÓDULO (prioritarias)");
    expect(prompt).toContain("booking:modify");
    expect(prompt).toContain("booking:cancel");
  });

  test("NO debe incluir la intentKey rechazada en las alternativas", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:create", // Misma intentKey - debe ser filtrada
        module: "booking",
        score: 0.8,
        text: "",
        requiresConfirmation: "always",
      },
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
      signals: { isConfirmed: false, isRejected: true, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("propose_alternative", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    // booking:create NO debe aparecer en las alternativas listadas
    expect(prompt).toContain("booking:modify");
    expect(prompt).not.toContain("1. booking:create");
  });

  test("debe priorizar sameModuleAlts sobre alternativas de otro módulo", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "products:find",
        module: "products",
        score: 0.8,
        text: "",
        requiresConfirmation: "always",
      },
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
      signals: { isConfirmed: false, isRejected: true, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("propose_alternative", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    // booking:modify debe estar en sameModuleAlts
    expect(prompt).toContain("ALTERNATIVAS DEL MISMO MÓDULO");
    expect(prompt).toContain("booking:modify");
  });

  test("debe generar prompt para propose_alternative con restaurant", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "products:find",
        module: "products",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("orders:create", "products", {
      alternatives,
      signals: { isConfirmed: false, isRejected: true, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("propose_alternative", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("PRODUCT ORDER RECHAZADO");
    expect(prompt).toContain("orders:create");
    expect(prompt).toContain("Ver menú");
  });

  test("debe manejar caso sin alternativas", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives: [],
      signals: { isConfirmed: false, isRejected: true, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("propose_alternative", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("No hay alternativas en BeliefState");
    expect(prompt).toContain("usa tu criterio");
  });

  test("debe usar ¿Te funciona? en las instrucciones de respuesta", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
    });
    const ctx = createMockCtx();
    const policy = createPolicy("propose_alternative", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    // Debe contener ejemplos de preguntas de cierre amables (variar naturalmente)
    expect(prompt).toContain("Pregunta de cierre amable");
    expect(prompt).toContain("¿Te funciona?");
    expect(prompt).toContain("¿Qué opinas?");
    expect(prompt).toContain("variar naturalmente");
  });
});

// ============================================
// TESTS: execute
// ============================================

describe("intentClassifierPrompt - execute", () => {
  test("debe generar prompt para execute con informational", () => {
    const intent = createBeliefIntent(
      "info:ask_business_hours",
      "informational",
      {
        requiresConfirmation: "never",
      },
    );
    const ctx = createMockCtx();
    const policy = createPolicy("execute", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("POLICY DECISION: execute");
    expect(prompt).toContain("INFORMACIÓN (no requiere acción del usuario)");
    expect(prompt).toContain("info:ask_business_hours");
    expect(prompt).toContain("¿Necesitas algo más?");
  });

  test("debe generar prompt para execute con social-protocol", () => {
    const intent = createBeliefIntent("social:greeting", "social-protocol", {
      requiresConfirmation: "never",
    });
    const ctx = createMockCtx();
    const policy = createPolicy("execute", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("PROTOCOLO SOCIAL / SEÑAL CONVERSACIONAL");
    expect(prompt).toContain("social:greeting");
    expect(prompt).toContain("NO ejecutes acciones de negocio");
  });

  test("debe generar prompt para execute con booking", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      requiresConfirmation: "always",
      signals: { isConfirmed: true, isRejected: false, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("execute", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("ACCIÓN DE NEGOCIO (booking/restaurant)");
    expect(prompt).toContain("booking:create");
    expect(prompt).toContain("Crear reserva");
    expect(prompt).toContain("NO pidas confirmación");
  });

  test("debe generar prompt para execute con restaurant", () => {
    const intent = createBeliefIntent("orders:create", "products", {
      requiresConfirmation: "always",
      signals: { isConfirmed: true, isRejected: false, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("execute", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("orders:create");
    expect(prompt).toContain("Hacer pedido");
    expect(prompt).toContain("¿Qué te gustaría pedir?");
  });

  test("debe mostrar el action en el prompt", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      signals: { isConfirmed: true, isRejected: false, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("execute", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("Action:");
  });
});

// ============================================
// TESTS: default (fallback)
// ============================================

describe("intentClassifierPrompt - default fallback", () => {
  test("debe manejar policy type desconocido", () => {
    const ctx = createMockCtx();
    const policy = { type: "unknown_type" as any, state: {} } as PolicyDecision;

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("ERROR: PolicyDecision no manejada");
    expect(prompt).toContain("FALLBACK");
    // Debe listar los módulos activos en el fallback
    expect(prompt).toContain("booking, restaurant, informational");
  });
});

// ============================================
// TESTS: integración con PolicyEngine flow
// ============================================

describe("intentClassifierPrompt - integración PolicyEngine", () => {
  test("debe manejar flujo completo: booking:create sin confirmar → ask_confirmation", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      requiresConfirmation: "always",
      signals: { isConfirmed: false, isRejected: false, isUncertain: false },
      alternatives: [
        {
          intentKey: "booking:modify",
          module: "booking",
          score: 0.75,
          text: "",
          requiresConfirmation: "always",
        },
      ],
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_confirmation", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("ask_confirmation");
    expect(prompt).toContain("booking:create");
    expect(prompt).toContain("Crear reserva");
  });

  test("debe manejar flujo: booking:create confirmado → execute", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      requiresConfirmation: "always",
      signals: { isConfirmed: true, isRejected: false, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("execute", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("execute");
    expect(prompt).toContain("NO pidas confirmación");
  });

  test("debe manejar flujo: booking:create rechazado → propose_alternative", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      requiresConfirmation: "always",
      signals: { isConfirmed: false, isRejected: true, isUncertain: false },
      alternatives,
    });
    const ctx = createMockCtx();
    const policy = createPolicy("propose_alternative", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("propose_alternative");
    expect(prompt).toContain("isRejected=true");
    expect(prompt).toContain("booking:modify");
  });

  test("debe manejar flujo: booking:create incierto → clear_up_uncertainty", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      requiresConfirmation: "always",
      signals: { isConfirmed: false, isRejected: false, isUncertain: true },
      alternatives,
    });
    const ctx = createMockCtx();
    const policy = createPolicy("clear_up_uncertainty", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("clear_up_uncertainty");
    expect(prompt).toContain("isUncertain=true");
    expect(prompt).toContain("NO uses intentKey");
  });

  test("debe manejar flujo: info:ask_* → execute (never)", () => {
    const intent = createBeliefIntent("info:ask_location", "informational", {
      requiresConfirmation: "never",
    });
    const ctx = createMockCtx();
    const policy = createPolicy("execute", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("execute");
    expect(prompt).toContain("info:ask_location");
    expect(prompt).toContain("INFORMACIÓN");
  });
});

// ============================================
// TESTS: edge cases
// ============================================

describe("intentClassifierPrompt - edge cases", () => {
  test("debe manejar intentKey undefined", () => {
    const intent = createBeliefIntent("", "unknown", { intentKey: "" as any });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_confirmation", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toBeDefined();
    expect(prompt.length).toBeGreaterThan(0);
  });

  test("debe manejar alternatives con score muy bajo", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.1,
        text: "",
        requiresConfirmation: "always",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_clarification", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("0.10");
  });

  test("debe manejar múltiples alternativas (más de 2)", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:modify",
        module: "booking",
        score: 0.8,
        text: "",
        requiresConfirmation: "always",
      },
      {
        intentKey: "booking:cancel",
        module: "booking",
        score: 0.75,
        text: "",
        requiresConfirmation: "always",
      },
      {
        intentKey: "booking:check_availability",
        module: "booking",
        score: 0.7,
        text: "",
        requiresConfirmation: "never",
      },
    ];

    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives,
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_clarification", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("booking:modify");
    expect(prompt).toContain("booking:cancel");
    expect(prompt).toContain("booking:check_availability");
  });

  test("debe manejar business name con businessType", () => {
    const ctx = createMockCtx({
      business: {
        name: "El Rinconcito",
        businessType: "Cafetería",
        assistantName: "CaféBot",
        general: {
          businessType: "Cafetería",
          // name: "El Rinconcito",
          description: "Test",
          timezone: "America/Lima",
        },
        contact: {
          phone: "",
          email: "",
          address: {
            street: "Calle Test",
            city: "CDMX",
            state: "CDMX",
            country: "México",
            postalCode: "00000",
          },
        },
        schedule: {
          monday: { open: "12:00", close: "23:00" },
          tuesday: { open: "12:00", close: "23:00" },
          wednesday: { open: "12:00", close: "23:00" },
          thursday: { open: "12:00", close: "23:00" },
          friday: { open: "12:00", close: "23:00" },
          saturday: { open: "12:00", close: "23:00" },
          sunday: { open: "12:00", close: "23:00" },
        },
      },
    } as unknown as RestaurantCtx);
    const policy = createPolicy("unknown_intent", undefined);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("CaféBot");
    expect(prompt).toContain("Cafetería El Rinconcito");
    expect(prompt).toContain("CONVERSATION BEHAVIOR");
  });
});
