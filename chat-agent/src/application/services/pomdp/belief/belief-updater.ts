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
        return 0.74;
      case "never":
        return 0.69;
      default:
        return 0.74;
    }
  }

  private isConfident(score: number, threshold: number): boolean {
    return score >= threshold;
  }

  public update(
    prevState: BeliefState,
    alternativeIntents: IntentPayloadWithScore[],
    mainIntent?: IntentPayloadWithScore,
  ): BeliefState {
    // Si no hay resultado nuevo, no cambiamos el estado (no creamos "nueva intención" artificial)
    if (!mainIntent) {
      return { ...prevState, isIntentFound: false };
    }

    if (prevState.current) {
      const previousIntent = prevState.current;

      const isMainItentConfident = this.isConfident(
        mainIntent.score,
        this.getThreshold(previousIntent.requiresConfirmation), // -> mismo nivel de riesgo que la intencion principal, nunca pude ser menor
      );

      // for confirmation | negation | doubt
      if (
        mainIntent.module === "conversational-signal" &&
        previousIntent.isConfident &&
        isMainItentConfident
      ) {
        // no deberiamos actualizar alternativeIntents porque solo estamos en una confirmacion
        const newIntent = this.updatePreviousIntent(previousIntent, mainIntent);
        return this.newSnapShot(prevState, newIntent);
      }
    }
    // We never store excludedModules alone
    if (this.excludedModules.includes(mainIntent.module)) {
      return { ...prevState };
    }

    // registramos la nueva intencion por primera vez
    const newIntent = this.newIntent(mainIntent, alternativeIntents);
    return this.newSnapShot(prevState, newIntent);
  }

  private updatePreviousIntent(
    prevIntent: BeliefIntent,
    mainIntent: IntentPayloadWithScore,
  ): BeliefIntent {
    //
    return {
      ...prevIntent,
      signals: {
        isConfirmed: mainIntent.intentKey === "signal:affirmation",
        isRejected: mainIntent.intentKey === "signal:negation",
        isUncertain: mainIntent.intentKey === "signal:uncertainty",
      },
    };
  }

  private newIntent(
    mainIntent: IntentPayloadWithScore,
    alternatives: IntentPayloadWithScore[] = [],
  ): BeliefIntent {
    const isConfident = this.isConfident(
      mainIntent.score,
      this.getThreshold(mainIntent.requiresConfirmation),
    );

    return {
      ...mainIntent,
      alternatives,
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
