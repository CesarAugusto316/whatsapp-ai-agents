import { IntentExampleKey } from "../intents/intent.types";
import { Observation } from "../observation/observation.types";
import { BeliefIntent, BeliefState } from "./belief.types";

export class BeliefUpdater {
  // Solo necesitamos UN umbral para decidir acciones
  private readonly CONFIDENCE_THRESHOLD = 0.65;

  static createEmpty(): BeliefState {
    return {
      intents: {},
      dominant: undefined,
      entropy: 0,
      confidence: 0,
      conversationTurns: 0,
      lastUpdate: Date.now(),
      needsClarification: false,
      isStuck: false,
    };
  }

  public update(current: BeliefState, observation: Observation): BeliefState {
    // 1. Tomar SOLO la intención más fuerte del RAG (la primera)
    const topResult = observation.intentResults[0];
    if (!topResult) {
      return this.createLowConfidenceState(current);
    }

    // 2. Calcular confianza base = score del RAG
    let confidence = topResult.score;

    // 3. Ajustar por "sí" / "no" del usuario
    if (current.dominant?.intent === topResult.intent) {
      if (observation.signals.isAffirmation) {
        confidence = Math.min(0.95, confidence + 0.3); // +30% por "sí"
      }
      if (observation.signals.isNegation) {
        confidence = Math.max(0.1, confidence - 0.5); // -50% por "no"
      }
    }

    // 4. Construir estado mínimo (solo 1 intención)
    const intentKey = topResult.intent;
    const newIntent: BeliefIntent = {
      key: intentKey,
      probability: confidence,
      evidence: current.intents[intentKey]?.evidence + 1 || 1,
      rejected: observation.signals.isNegation ? 1 : 0,
      requiresConfirmation: topResult.requiresConfirmation,
      lastSeen: Date.now(),
    };

    const dominant =
      confidence > this.CONFIDENCE_THRESHOLD
        ? ({
            intent: intentKey,
            requiresConfirmation: topResult.requiresConfirmation,
          } satisfies BeliefState["dominant"])
        : undefined;

    return {
      intents: { [intentKey]: newIntent }, // Solo guardamos la mejor
      dominant,
      entropy: 1 - confidence, // Simplificado: 0=seguro, 1=confundido
      confidence,
      conversationTurns: current.conversationTurns + 1,
      lastUpdate: Date.now(),
      needsClarification: confidence < this.CONFIDENCE_THRESHOLD,
      isStuck: current.conversationTurns > 5 && confidence < 0.4,
    };
  }

  private createLowConfidenceState(current: BeliefState): BeliefState {
    return {
      ...current,
      confidence: 0.1,
      entropy: 0.9,
      needsClarification: true,
      conversationTurns: current.conversationTurns + 1,
      lastUpdate: Date.now(),
    };
  }
}
