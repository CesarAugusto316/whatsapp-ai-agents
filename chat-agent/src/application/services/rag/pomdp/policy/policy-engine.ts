// ============================================
// 4. POLICY ENGINE (Decisiones)
// ============================================

import { RestaurantProps } from "@/domain/restaurant";
import { BeliefState } from "../intents/intent.types";

type PolicyAction =
  | { type: "clarify"; question: string }
  | { type: "confirm"; intent: string }
  | { type: "execute"; intent: string; saga: string }
  | { type: "fallback"; reason: string };

export class PolicyEngine {
  decide(belief: BeliefState, context: RestaurantProps): PolicyAction {
    // 1. Si está atascado → fallback a humano o resetear
    if (belief.isStuck) {
      return {
        type: "fallback",
        reason: "conversation_stuck",
      };
    }

    // 2. Si hay alta incertidumbre → clarificar
    if (belief.needsClarification) {
      return this.generateClarification(belief);
    }

    // 3. Si hay intención dominante clara → confirmar o ejecutar
    if (belief.dominant && belief.confidence > 0.8) {
      // Si es primera vez que aparece con alta confianza → confirmar
      const intent = belief.intents[belief.dominant];
      if (intent.evidence <= 2) {
        return {
          type: "confirm",
          intent: belief.dominant,
        };
      }

      // Si ya fue confirmado → ejecutar
      return {
        type: "execute",
        intent: belief.dominant,
        saga: this.mapIntentToSaga(belief.dominant),
      };
    }

    // 4. Default: hacer pregunta abierta
    return {
      type: "clarify",
      question: "¿En qué puedo ayudarte hoy?",
    };
  }

  private generateClarification(belief: BeliefState): PolicyAction {
    // Top 2-3 intenciones como opciones
    const topIntents = Object.values(belief.intents)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3)
      .map((i) => i.key);

    const questions: Record<string, string> = {
      create_booking: "¿Quieres hacer una reserva?",
      request_menu: "¿Quieres ver el menú?",
      start_order: "¿Quieres hacer un pedido?",
    };

    const options = topIntents.map((i) => questions[i] || i).join(" o ");

    return {
      type: "clarify",
      question: `No estoy seguro si quieres ${options}. ¿Podrías aclararlo?`,
    };
  }

  private mapIntentToSaga(intent: string): string {
    const map: Record<string, string> = {
      create_booking: "MAKE_STARTED",
      modify_booking: "UPDATE_STARTED",
      cancel_booking: "CANCEL_VALIDATED",
      start_order: "ORDER_STARTED",
    };

    return map[intent] || "CONVERSATIONAL";
  }
}
