import { test, expect } from "bun:test";
import { PolicyEngine } from "@/application/services/pomdp/policy/policy-engine";
import { BeliefState } from "@/application/services/pomdp";

test('requiresConfirmation="never" + score=0.8 → type="execute"', () => {
  const engine = new PolicyEngine();

  const state: BeliefState = {
    executedIntents: [],
    current: {
      intentKey: "restaurant:ask_price",
      module: "restaurant",
      score: 0.8,
      requiresConfirmation: "never" as const,
      signals: {
        isConfirmed: false,
        isRejected: false,
        isUncertain: false,
      },
      isConfident: true,
    },
    previous: undefined,
    lastUpdate: Date.now(),
    isIntentFound: true,
  };

  const decision = engine.decide(state);

  expect(decision.type).toBe("execute");
  expect(decision.intent).toBeDefined();
});

test('requiresConfirmation="maybe" + score=0.8 → type="execute"', () => {
  const engine = new PolicyEngine();

  const state: BeliefState = {
    executedIntents: [],
    current: {
      intentKey: "booking:create",
      module: "booking",
      score: 0.8,
      requiresConfirmation: "maybe" as const,
      signals: {
        isConfirmed: false,
        isRejected: false,
        isUncertain: false,
      },
      isConfident: true,
    },
    previous: undefined,
    lastUpdate: Date.now(),
    isIntentFound: true,
  };

  const decision = engine.decide(state);

  expect(decision.type).toBe("execute");
  expect(decision.intent).toBeDefined();
});

test('requiresConfirmation="maybe" + score=0.6 → type="ask_clarification" (fallback)', () => {
  const engine = new PolicyEngine();

  const state: BeliefState = {
    executedIntents: [],
    current: {
      intentKey: "booking:create",
      module: "booking",
      score: 0.6,
      requiresConfirmation: "maybe" as const,
      signals: {
        isConfirmed: false,
        isRejected: false,
        isUncertain: false,
      },
      isConfident: false,
    },
    previous: undefined,
    lastUpdate: Date.now(),
    isIntentFound: true,
  };

  const decision = engine.decide(state);

  expect(decision.type).toBe("propose_alternative");
  expect(decision.intent).toBeDefined();
});

test('requiresConfirmation="always" sin signals → type="ask_confirmation"', () => {
  const engine = new PolicyEngine();

  const state: BeliefState = {
    executedIntents: [],
    current: {
      intentKey: "booking:cancel",
      module: "booking",
      score: 0.9,
      requiresConfirmation: "always" as const,
      signals: {
        isConfirmed: false,
        isRejected: false,
        isUncertain: false,
      },
      isConfident: true,
    },
    previous: undefined,
    lastUpdate: Date.now(),
    isIntentFound: true,
  };

  const decision = engine.decide(state);

  expect(decision.type).toBe("ask_confirmation");
  expect(decision.intent).toBeDefined();
});

test('requiresConfirmation="always" + signals.isConfirmed=true → type="execute"', () => {
  const engine = new PolicyEngine();

  const state: BeliefState = {
    executedIntents: [],
    current: {
      intentKey: "booking:create",
      module: "booking",
      score: 0.9,
      requiresConfirmation: "always" as const,
      signals: {
        isConfirmed: true,
        isRejected: false,
        isUncertain: false,
      },
      isConfident: true,
    },
    previous: undefined,
    lastUpdate: Date.now(),
    isIntentFound: true,
  };

  const decision = engine.decide(state);

  expect(decision.type).toBe("execute");
  expect(decision.intent).toBeDefined();
});

test('requiresConfirmation="always" + signals.isRejected=true → type="propose_alternative"', () => {
  const engine = new PolicyEngine();

  const state: BeliefState = {
    executedIntents: [],
    current: {
      intentKey: "booking:create",
      module: "booking",
      score: 0.9,
      requiresConfirmation: "always" as const,
      signals: {
        isConfirmed: false,
        isRejected: true,
        isUncertain: false,
      },
      isConfident: true,
    },
    previous: undefined,
    lastUpdate: Date.now(),
    isIntentFound: true,
  };

  const decision = engine.decide(state);

  expect(decision.type).toBe("propose_alternative");
  expect(decision.intent).toBeDefined();
});

test('requiresConfirmation="always" + signals.isUncertain=true → type="clear_up_uncertainty"', () => {
  const engine = new PolicyEngine();

  const state: BeliefState = {
    executedIntents: [],
    current: {
      intentKey: "booking:create",
      module: "booking",
      score: 0.9,
      requiresConfirmation: "always" as const,
      signals: {
        isConfirmed: false,
        isRejected: false,
        isUncertain: true,
      },
      isConfident: true,
    },
    previous: undefined,
    lastUpdate: Date.now(),
    isIntentFound: true,
  };

  const decision = engine.decide(state);

  expect(decision.type).toBe("clear_up_uncertainty");
  expect(decision.intent).toBeDefined();
});

test('isIntentFound=false → type="unknown_intent"', () => {
  const engine = new PolicyEngine();

  const state: BeliefState = {
    executedIntents: [],
    current: undefined,
    previous: undefined,
    lastUpdate: Date.now(),
    isIntentFound: false,
  };

  const decision = engine.decide(state);

  expect(decision.type).toBe("unknown_intent");
  expect(decision.intent).toBeUndefined();
});

test('requiresConfirmation con valor inválido → type="ask_clarification" (fallback)', () => {
  const engine = new PolicyEngine();

  const state: BeliefState = {
    executedIntents: [],
    current: {
      intentKey: "booking:create",
      module: "booking",
      score: 0.9,
      requiresConfirmation: "invalid_value" as any,
      signals: {
        isConfirmed: false,
        isRejected: false,
        isUncertain: false,
      },
      isConfident: true,
    },
    previous: undefined,
    lastUpdate: Date.now(),
    isIntentFound: true,
  };

  const decision = engine.decide(state);

  expect(decision.type).toBe("ask_clarification");
  expect(decision.intent).toBeDefined();
});
