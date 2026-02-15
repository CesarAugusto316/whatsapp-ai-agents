import { ModuleKind, RequiredConfirmation } from "../intents/intent.types";
import { IntentPayloadWithScore } from "../pomdp-manager";
import { BeliefIntent, BeliefState } from "./belief.types";

/**
 *
 * @todo ML predictivo (mejor detección de intenciones)
 */
export class BeliefStateUpdater {
  // Solo necesitamos UN umbral para decidir acciones

  private readonly excludedModules: ModuleKind[] = ["social-protocol"];

  static createEmpty(): BeliefState {
    return {
      topResults: [],
      executedIntents: [],
      current: undefined,
      previous: undefined,
      lastUpdate: Date.now(),
      isIntentFound: false,
    };
  }

  private getThreshold(Key: RequiredConfirmation): number {
    const base = Key.trim() as RequiredConfirmation;
    switch (base) {
      case "always":
        return 0.8;
      case "maybe":
        return 0.7;
      case "never":
        return 0.65;
      default:
        return 0.75;
    }
  }

  private isConfident(score: number, threshold: number): boolean {
    return score >= threshold;
  }

  public update(
    prevState: BeliefState,
    topResult?: IntentPayloadWithScore,
  ): BeliefState {
    // Si no hay resultado nuevo, no cambiamos el estado (no creamos "nueva intención" artificial)
    if (!topResult) {
      return { ...prevState, isIntentFound: false };
    }

    if (prevState.current) {
      const previousIntent = prevState.current;

      const isTopResultConfident = this.isConfident(
        topResult.score,
        this.getThreshold(previousIntent.requiresConfirmation), // -> mismo nivel de riesgo que la intencion principal, nunca pude ser menor
      );

      if (
        topResult.module === "conversational-signal" &&
        previousIntent.isConfident &&
        isTopResultConfident
      ) {
        const newIntent = this.updatePreviousIntent(previousIntent, topResult);
        return this.newSnapShot(prevState, newIntent);
      }
    }
    // We never store excludedModules alone
    if (this.excludedModules.includes(topResult.module)) {
      return { ...prevState };
    }

    // registramos las nuevas intenciones
    const newIntent = this.newIntent(topResult);
    return this.newSnapShot(prevState, newIntent);
  }

  private updatePreviousIntent(
    prevIntent: BeliefIntent,
    topResult: IntentPayloadWithScore,
  ): BeliefIntent {
    //
    return {
      ...prevIntent,
      signals: {
        isConfirmed: topResult.intentKey === "signal:affirmation",
        isRejected: topResult.intentKey === "signal:negation",
        isUncertain: topResult.intentKey === "signal:uncertainty",
      },
    };
  }

  private newIntent(topResult: IntentPayloadWithScore): BeliefIntent {
    const isConfident = this.isConfident(
      topResult.score,
      this.getThreshold(topResult.requiresConfirmation),
    );

    return {
      ...topResult,
      signals: {
        isConfirmed: false,
        isRejected: false,
        isUncertain: false,
      },
      isConfident,
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
