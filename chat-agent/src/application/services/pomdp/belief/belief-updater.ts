import { ModuleKind } from "../intents/intent.types";
import { IntentPayloadWithScore } from "../pomdp-manager";
import { BeliefIntent, BeliefState } from "./belief.types";

export class BeliefStateUpdater {
  // Solo necesitamos UN umbral para decidir acciones
  private readonly CONFIDENCE_THRESHOLD = 0.75;
  private readonly excludedModules: ModuleKind[] = [
    "conversational-signal",
    "social-protocol",
  ];

  static createEmpty(): BeliefState {
    return {
      executedIntents: [],
      current: undefined,
      previous: undefined,
      intentCorrections: 0,
      lastUpdate: Date.now(),
      isIntentFound: false,
    };
  }

  public update(
    prevState: BeliefState,
    topResult?: IntentPayloadWithScore,
  ): BeliefState {
    // Si no hay resultado nuevo, no cambiamos el estado (no creamos "nueva intención" artificial)
    if (!topResult) {
      return { ...prevState, isIntentFound: false };
    }

    if (
      (prevState.current?.requiresConfirmation === "always" ||
        prevState.current?.requiresConfirmation === "maybe") &&
      topResult.score >= this.CONFIDENCE_THRESHOLD &&
      topResult.module === "conversational-signal"
    ) {
      const newIntent = this.signalPrevIntent(prevState.current, topResult);
      return this.newSnapShot(prevState, newIntent);
    }
    // exclude modules because we don't need to have them
    if (this.excludedModules.includes(topResult.module)) {
      return { ...prevState };
    }

    // registramos las nuevas intenciones
    const newIntent = this.newIntent(topResult);
    return this.newSnapShot(prevState, newIntent);
  }

  private signalPrevIntent(
    prevIntent: BeliefIntent,
    topResult: IntentPayloadWithScore,
  ): BeliefIntent {
    //
    return {
      ...prevIntent,
      signals: {
        isConfirmed: topResult.intent === "signal:affirmation",
        isRejected: topResult.intent === "signal:negation",
        isUncertain: topResult.intent === "signal:uncertainty",
      },
    };
  }

  private newIntent(topResult: IntentPayloadWithScore): BeliefIntent {
    return {
      ...topResult,
      signals: {
        isConfirmed: false,
        isRejected: false,
        isUncertain: false,
      },
    };
  }

  private newSnapShot(
    prev: BeliefState,
    curr: BeliefIntent,
    isIntentFound = true,
  ): BeliefState {
    //
    return {
      ...prev,
      previous: prev.current,
      current: curr,
      lastUpdate: Date.now(),
      isIntentFound,
      intentCorrections:
        // Si la intención anterior es diferente de la nueva intención
        (prev.current?.intent && prev.current?.intent) !== curr.intent
          ? (prev?.intentCorrections ?? 0) + 1
          : prev.intentCorrections,
    };
  }
}
