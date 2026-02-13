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
    //
    if (!topResult && prevState.current) {
      const newIntent = this.newIntent(prevState.current);
      const isIntentFound = false;
      return this.newSnapShot(prevState, newIntent, isIntentFound);
    }

    // 1. Confirmando|Negando|Questionando una intencion previa y actualizando el estado
    if (topResult?.module === "conversational-signal") {
      if (
        (prevState.current?.requiresConfirmation === "always" ||
          prevState.current?.requiresConfirmation === "maybe") &&
        topResult.score >= this.CONFIDENCE_THRESHOLD
      ) {
        const newIntent = this.signalPrevIntent(prevState.current, topResult);
        return this.newSnapShot(prevState, newIntent);
      }

      // 4. Construir estado mínimo (solo 1 intención)
      const newIntent = this.newIntent(topResult);
      return this.newSnapShot(prevState, newIntent);
    } //
    else if (topResult && prevState.current) {
      // 4. Construir estado mínimo (solo 1 intención)
      const newIntent = this.newIntent(topResult);
      return this.newSnapShot(prevState, newIntent);
    }

    // 4. Construir estado mínimo (solo 1 intención)
    return { ...prevState };
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
