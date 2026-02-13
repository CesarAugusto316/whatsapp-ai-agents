import { test, expect } from "bun:test";
import { BeliefStateUpdater } from "@/application/services/pomdp/belief/belief-updater";
import { BeliefState } from "@/application/services/pomdp/belief/belief.types";
import { IntentPayloadWithScore } from "@/application/services/pomdp";

test("Primer mensaje → nuevo intent con isConfident calculado usando su propio requiresConfirmation", () => {
  const updater = new BeliefStateUpdater();
  const initialState = BeliefStateUpdater.createEmpty();

  const topResult: IntentPayloadWithScore = {
    intentKey: "restaurant:ask_price",
    module: "restaurant",
    score: 0.7,
    requiresConfirmation: "never" as const,
  };

  const newState = updater.update(initialState, topResult);

  expect(newState.current).toBeDefined();
  expect(newState.current!.intentKey).toBe("restaurant:ask_price");
  expect(newState.current!.isConfident).toBe(true); // score 0.7 >= threshold 0.65 for 'never'
});

test("Señal de confirmación sobre intent anterior", () => {
  const updater = new BeliefStateUpdater();

  const initialState: BeliefState = {
    executedIntents: [],
    current: {
      intentKey: "booking:create",
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

  const topResult: IntentPayloadWithScore = {
    intentKey: "signal:affirmation",
    module: "conversational-signal",
    score: 0.85,
    requiresConfirmation: "always" as const,
  };

  const newState = updater.update(initialState, topResult);

  expect(newState.current).toBeDefined();
  expect(newState.current!.signals.isConfirmed).toBe(true);
  expect(newState.current!.isConfident).toBe(true);
});

test("Módulo excluido sin contexto previo", () => {
  const updater = new BeliefStateUpdater();
  const initialState = BeliefStateUpdater.createEmpty();

  const topResult: IntentPayloadWithScore = {
    intentKey: "social:greeting",
    module: "social-protocol" as const,
    score: 0.9,
    requiresConfirmation: "always" as const,
  };

  const newState = updater.update(initialState, topResult);

  expect(newState.current).toBeUndefined();
});

test("Transición entre intents", () => {
  const updater = new BeliefStateUpdater();
  const initialState = BeliefStateUpdater.createEmpty();

  // Primer intent: booking:cancel (always, score=0.85) → isConfident=true
  const firstResult: IntentPayloadWithScore = {
    intentKey: "booking:cancel",
    module: "booking",
    score: 0.85,
    requiresConfirmation: "always" as const,
  };

  const stateAfterFirst = updater.update(initialState, firstResult);

  expect(stateAfterFirst.current).toBeDefined();
  expect(stateAfterFirst.current!.intentKey).toBe("booking:cancel");
  expect(stateAfterFirst.current!.isConfident).toBe(true); // score 0.85 >= threshold 0.8 for 'always'

  // Segundo intent: restaurant:ask_price (never, score=0.7) → isConfident=true (usa su propio threshold 0.65)
  const secondResult: IntentPayloadWithScore = {
    intentKey: "restaurant:ask_price",
    module: "restaurant",
    score: 0.7,
    requiresConfirmation: "never" as const,
  };

  const stateAfterSecond = updater.update(stateAfterFirst, secondResult);

  expect(stateAfterSecond.current).toBeDefined();
  expect(stateAfterSecond.current!.intentKey).toBe("restaurant:ask_price");
  expect(stateAfterSecond.current!.isConfident).toBe(true); // score 0.7 >= threshold 0.65 for 'never'
});
