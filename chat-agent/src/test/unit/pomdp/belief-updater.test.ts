import { test, expect } from "bun:test";
import {
  IntentPayloadWithScore,
  BeliefState,
  BeliefStateUpdater,
} from "@/application/services/pomdp";

test("Primer mensaje → nuevo intent con isConfident calculado usando su propio requiresConfirmation", () => {
  const updater = new BeliefStateUpdater();
  const initialState = BeliefStateUpdater.createEmpty();

  const topResult: IntentPayloadWithScore = {
    intentKey: "info:ask_price",
    module: "products",
    score: 0.7,
    requiresConfirmation: "never",
    text: "",
  };

  const newState = updater.update(initialState, [], topResult);

  expect(newState.current).toBeDefined();
  expect(newState.current!.intentKey).toBe("info:ask_price");
  expect(newState.current!.isConfident).toBe(true); // score 0.7 >= threshold 0.65 for 'never'
});

test("Señal de confirmación sobre intent anterior", () => {
  const updater = new BeliefStateUpdater();

  const initialState: BeliefState = {
    executedIntents: [],
    current: {
      alternatives: [],
      text: "",
      intentKey: "booking:create",
      module: "booking",
      score: 0.9,
      requiresConfirmation: "always",
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
    requiresConfirmation: "always",
    text: "",
  };

  const newState = updater.update(initialState, [], topResult);

  expect(newState.current).toBeDefined();
  expect(newState.current!.signals.isConfirmed).toBe(true);
  expect(newState.current!.isConfident).toBe(true);
});

test("Transición entre intents", () => {
  const updater = new BeliefStateUpdater();
  const initialState = BeliefStateUpdater.createEmpty();

  // Primer intent: booking:cancel (always, score=0.85) → isConfident=true
  const firstResult: IntentPayloadWithScore = {
    intentKey: "booking:cancel",
    module: "booking",
    score: 0.85,
    requiresConfirmation: "always",
    text: "",
  };

  const stateAfterFirst = updater.update(initialState, [], firstResult);

  expect(stateAfterFirst.current).toBeDefined();
  expect(stateAfterFirst.current!.intentKey).toBe("booking:cancel");
  expect(stateAfterFirst.current!.isConfident).toBe(true); // score 0.85 >= threshold 0.8 for 'always'

  // Segundo intent: info:ask_price (never, score=0.7) → isConfident=true (usa su propio threshold 0.65)
  const secondResult: IntentPayloadWithScore = {
    intentKey: "info:ask_price",
    module: "products",
    score: 0.7,
    requiresConfirmation: "never",
    text: "",
  };

  const stateAfterSecond = updater.update(stateAfterFirst, [], secondResult);

  expect(stateAfterSecond.current).toBeDefined();
  expect(stateAfterSecond.current!.intentKey).toBe("info:ask_price");
  expect(stateAfterSecond.current!.isConfident).toBe(true); // score 0.7 >= threshold 0.65 for 'never'
});
