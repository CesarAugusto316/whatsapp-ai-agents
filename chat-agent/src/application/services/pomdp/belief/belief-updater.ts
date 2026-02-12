import { IntentExampleKey } from "../intents/intent.types";

import { PayloadWithScore } from "../pomdp-manager";
import { BeliefIntent, BeliefState } from "./belief.types";

export class BeliefStateUpdater {
  // Solo necesitamos UN umbral para decidir acciones
  private readonly CONFIDENCE_THRESHOLD = 0.65;

  static createEmpty(): BeliefState {
    return {
      current: undefined,
      previous: undefined,
      conversationTurns: 0,
      lastUpdate: Date.now(),
      isStuck: false,
    };
  }

  public update(
    prevState: BeliefState,
    topResult?: PayloadWithScore,
  ): BeliefState {
    // 1. Tomar SOLO la intención más fuerte del RAG (la primera)
    // const topResult = newObservation.intentResults[0];
    if (!topResult) {
      return this.createLowConfidenceState(prevState);
    }

    if (prevState.current && topResult.module === "conversational-signal") {
      //
      if (topResult.intent === "signal:affirmation") {
        //
      }
      if (topResult.intent === "signal:negation") {
        //
      }
      if (topResult.intent === "signal:uncertainty") {
        //
      }
      return prevState;
    }
    if (topResult.module === "social-protocol") {
      return prevState;
    }

    // 2. Calcular confianza base = score del RAG
    let confidence = topResult.score;

    // 3. Ajustar por "sí" / "no" del usuario
    if (
      prevState.previous?.requiresConfirmation === "always" ||
      prevState.previous?.requiresConfirmation === "maybe"
    ) {
      if (
        // newObservation.signals.isAffirmation ||
        topResult.intent === "signal:affirmation"
      ) {
        confidence = Math.min(0.95, confidence + 0.3); // +30% por "sí"
      }
      if (
        // newObservation.signals.isNegation ||
        topResult.intent === "signal:negation"
      ) {
        confidence = Math.max(0.1, confidence - 0.5); // -50% por "no"
      }
    }

    // 4. Construir estado mínimo (solo 1 intención)
    const intentKey = topResult.intent;
    const newIntent: BeliefIntent = {
      ...topResult,
      signals: {},
      // evidence: prevState.intents[intentKey]?.evidence + 1 || 1,
      // rejected: 0,
      requiresConfirmation: topResult.requiresConfirmation,
      createdAt: Date.now(),
    };

    return {
      previous: prevState.current,
      // intents: { [intentKey]: newIntent }, // Solo guardamos la mejor
      // dominant,
      // entropy: 1 - confidence, // Simplificado: 0=seguro, 1=confundido
      // confidence,
      conversationTurns: prevState.conversationTurns + 1,
      lastUpdate: Date.now(),
      // needsClarification: confidence < this.CONFIDENCE_THRESHOLD,
      isStuck: prevState.conversationTurns > 5 && confidence < 0.4,
    };
  }

  private createLowConfidenceState(current: BeliefState): BeliefState {
    return {
      ...current,
      // confidence: 0.1,
      // entropy: 0.9,

      conversationTurns: current.conversationTurns + 1,
      lastUpdate: Date.now(),
    };
  }
}
