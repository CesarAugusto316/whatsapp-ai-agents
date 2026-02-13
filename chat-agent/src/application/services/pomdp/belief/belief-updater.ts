import { PayloadWithScore } from "../pomdp-manager";
import { BeliefIntent, BeliefState } from "./belief.types";

export class BeliefStateUpdater {
  // Solo necesitamos UN umbral para decidir acciones
  private readonly CONFIDENCE_THRESHOLD = 0.75;

  static createEmpty(): BeliefState {
    return {
      executedIntents: [],
      current: undefined,
      previous: undefined,
      intentJumps: 0,
      lastUpdate: Date.now(),
      isIntentFound: false,
    };
  }

  public update(
    prevState: BeliefState,
    topResult?: PayloadWithScore,
  ): BeliefState {
    // Si no hay resultado nuevo, no cambiamos el estado (no creamos "nueva intención" artificial)
    if (!topResult) {
      return { ...prevState };
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

    // Si no aplica confirmación, tratamos la señal como nueva intención
    const newIntent = this.newIntent(topResult);
    return this.newSnapShot(prevState, newIntent);
  }

  private signalPrevIntent(
    prevIntent: BeliefIntent,
    topResult: PayloadWithScore,
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

  private newIntent(topResult: PayloadWithScore): BeliefIntent {
    return {
      ...topResult,
      signals: {},
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
    };
  }
}
