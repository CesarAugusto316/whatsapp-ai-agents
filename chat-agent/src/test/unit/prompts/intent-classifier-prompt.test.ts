import { test, expect, describe } from "bun:test";
import { intentClassifierPrompt } from "@/domain/booking";
import type {
  PolicyDecision,
  BeliefIntent,
} from "@/application/services/pomdp";
import type { DomainCtx } from "@/domain/booking";

// ============================================
// HELPERS PARA CREAR TEST DATA
// ============================================

const createMockCtx = (overrides?: Partial<DomainCtx>): DomainCtx =>
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
    activeModules: ["booking", "products", "orders", "informational"],
    beliefState: undefined,
    ...overrides,
  }) as DomainCtx;

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

    expect(prompt).toContain("POLICY: unknown_intent");
    expect(prompt).toContain("booking, products, orders");
    expect(prompt).toContain("RESERVAS");
    expect(prompt).toContain("PRODUCTOS");
    expect(prompt).toContain('NO digas "no entendí"');
    expect(prompt).toContain("NO pidas datos");
    expect(prompt).toContain("¿Quieres reservar, pedir comida o ver el menú?");
    expect(prompt).toContain("TestBot");
    expect(prompt).toContain("Test Restaurant");
  });

  test("debe generar prompt para unknown_intent solo con booking activo", () => {
    const ctx = createMockCtx({ activeModules: ["booking"] });
    const policy = createPolicy("unknown_intent", undefined);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("RESERVAS");
    expect(prompt).not.toContain("PRODUCTOS");
  });

  test("debe generar prompt para unknown_intent solo con restaurant activo", () => {
    const ctx = createMockCtx({ activeModules: ["products", "orders"] });
    const policy = createPolicy("unknown_intent", undefined);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("PRODUCTOS");
    expect(prompt).toContain("PEDIDOS");
    expect(prompt).not.toContain("RESERVAS");
  });

  test("debe generar prompt para unknown_intent solo con informational activo", () => {
    const ctx = createMockCtx({ activeModules: ["informational"] });
    const policy = createPolicy("unknown_intent", undefined);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("INFORMACIÓN");
    expect(prompt).toContain("Horarios");
    expect(prompt).toContain("Ubicación");
    expect(prompt).toContain("Pago");
    expect(prompt).toContain("Contacto");
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

    expect(prompt).toContain("POLICY: ask_clarification");
    expect(prompt).toContain("booking:create");
    expect(prompt).toContain("booking:modify");
    expect(prompt).toContain("ALTERNATIVAS");
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
    expect(prompt).toContain("Restaurante");
  });

  test("debe generar prompt para ask_clarification sin alternativas", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives: [],
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_clarification", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("Sin alternativas");
  });

  test("debe filtrar la intentKey actual de las alternativas", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:create",
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

    expect(prompt).toContain("modificar reserva");
    expect(prompt).toContain("cancelar reserva");
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

    expect(prompt).toContain("POLICY: clear_up_uncertainty");
    expect(prompt).toContain("Usuario indeciso");
    expect(prompt).toContain("ALTERNATIVAS (excluyendo booking:create)");
    expect(prompt).toContain("NO uses");
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

    expect(prompt).toContain("Opción A");
    expect(prompt).toContain("Opción B");
    expect(prompt).toContain("booking:modify");
  });

  test("debe usar fallback cuando no hay alternativas", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives: [],
      signals: { isConfirmed: false, isRejected: false, isUncertain: true },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("clear_up_uncertainty", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("Sin alternativas");
    expect(prompt).toContain("opciones genéricas");
  });

  test("debe filtrar alternativas que coinciden con intentKey", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:create",
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

    expect(prompt).toContain("POLICY: ask_confirmation");
    expect(prompt).toContain("booking:create");
    expect(prompt).toContain("Crear reserva");
    expect(prompt).toContain("✅");
    expect(prompt).toContain('NO "¿Estás seguro?"');
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
  });

  test("debe incluir ejemplos específicos por módulo", () => {
    const intent = createBeliefIntent("booking:cancel", "booking", {
      requiresConfirmation: "always",
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_confirmation", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("booking:cancel");
    expect(prompt).toContain("Cancelar reserva");
    expect(prompt).toContain("Conector natural");
  });

  test("debe mostrar requiresConfirmation del intent", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      requiresConfirmation: "always",
    });
    const ctx = createMockCtx();
    const policy = createPolicy("ask_confirmation", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("Requiere confirmación");
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

    expect(prompt).toContain("POLICY: propose_alternative");
    expect(prompt).toContain("isRejected=true");
    expect(prompt).toContain("booking:modify");
    expect(prompt).toContain("booking:cancel");
  });

  test("NO debe incluir la intentKey rechazada en las alternativas", () => {
    const alternatives: BeliefIntent["alternatives"] = [
      {
        intentKey: "booking:create",
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

    expect(prompt).toContain("products:find");
    expect(prompt).toContain("orders:create");
    expect(prompt).toContain("PRIORIDAD");
  });

  test("debe manejar caso sin alternativas", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      alternatives: [],
      signals: { isConfirmed: false, isRejected: true, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("propose_alternative", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("Sin alternativas");
  });

  test("debe usar preguntas de cierre amables", () => {
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

    expect(prompt).toContain("Cierra variado");
    expect(prompt).toContain("¿Te funciona?");
    expect(prompt).toContain("¿Qué opinas?");
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

    expect(prompt).toContain("POLICY: execute");
    expect(prompt).toContain("INFORMACIÓN");
    expect(prompt).toContain("info:ask_business_hours");
    expect(prompt).toContain("¿Te ayudo con algo más?");
  });

  test("debe generar prompt para execute con social-protocol", () => {
    const intent = createBeliefIntent("social:greeting", "social-protocol", {
      requiresConfirmation: "never",
    });
    const ctx = createMockCtx();
    const policy = createPolicy("execute", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("SOCIAL");
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

    expect(prompt).toContain("BOOKING");
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
  });

  test("debe mostrar el action en el prompt", () => {
    const intent = createBeliefIntent("booking:create", "booking", {
      signals: { isConfirmed: true, isRejected: false, isUncertain: false },
    });
    const ctx = createMockCtx();
    const policy = createPolicy("execute", intent);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("ACCIÓN:");
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

    expect(prompt).toContain("POLICY: unknown_intent");
    expect(prompt).toContain("booking, products, orders");
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
    expect(prompt).toContain("Usuario indeciso");
    expect(prompt).toContain("NO uses");
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

    expect(prompt).toBeDefined();
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
    } as unknown as DomainCtx);
    const policy = createPolicy("unknown_intent", undefined);

    const prompt = intentClassifierPrompt(ctx, policy);

    expect(prompt).toContain("CaféBot");
    expect(prompt).toContain("Cafetería");
  });
});
