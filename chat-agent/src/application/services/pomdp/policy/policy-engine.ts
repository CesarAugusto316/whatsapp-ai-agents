import { BeliefIntent, BeliefState } from "../belief/belief.types";
import { BookingOptions } from "@/domain/booking";
import { IntentExampleKey } from "../intents/intent.types";

// ============================================
// POLICY ENGINE — Simple, legible, mantenible
// ============================================

export type PolicyDecision =
  | {
      type: "unknown_intent"; // Intent not recognized, so we must provide the available options
      intent: undefined;
      state: BeliefState;
    }
  | {
      type: "ask_clarification"; // when we are not sure about the intent
      intent: BeliefIntent;
      state: BeliefState;
    }
  | {
      type: "clear_up_uncertainty"; // when we are sure the user is unsure
      intent: BeliefIntent;
      state: BeliefState;
    }
  | { type: "ask_confirmation"; intent: BeliefIntent; state: BeliefState } // when we want confirm an intent (if required)
  | { type: "propose_alternative"; intent: BeliefIntent; state: BeliefState } // when an our initial beliefIntent was rejected
  | {
      type: "execute";
      intent: BeliefIntent;
      action: IntentExampleKey;
      state: BeliefState;
    };

/**
 *
 * @todo implement Reinforce learning RL (decisión secuencial óptima)
 * @example
 * Futuro híbrido (ejemplo conceptual)
 * class PolicyEngine {
 *  decide(belief: BeliefState): PolicyDecision {
 *    // 1. Fallback seguro: reglas deterministas (tu código actual)
 *    const ruleBased = this.ruleBasedDecision(belief);
 *
 *    // 2. Solo si el sistema está en modo "aprendizaje" y la confianza del modelo es alta
 *    if (this.rlMode && this.rlConfidence > 0.9) {
 *      return this.rlPolicy.decide(belief);
 *    }
 *
 *    // 3. Siempre cae a reglas deterministas (control humano explícito)
 *    return ruleBased;
 *  }
 * }
 */
export class PolicyEngine {
  //
  public decide(belief: BeliefState): PolicyDecision {
    const intent = belief.current;
    if (!belief.isIntentFound || !intent) {
      return { type: "unknown_intent", intent: undefined, state: belief };
    }

    const clonedBelief = structuredClone(belief);

    // 1. Regla: "never" → ejecutar inmediatamente
    if (intent.requiresConfirmation === "never" && intent.isConfident) {
      return {
        type: "execute",
        intent,
        action: this.mapIntentToWorkflow(intent.intentKey),
        state: this.markAsExecuted(clonedBelief, intent),
      };
    }

    // 2. Regla: "maybe" → ejecutar si la confianza es alta, sino pedir confirmación
    if (intent.requiresConfirmation === "maybe") {
      if (intent.isConfident) {
        return {
          type: "execute",
          intent,
          action: this.mapIntentToWorkflow(intent.intentKey),
          state: this.markAsExecuted(clonedBelief, intent),
        };
      }
      // Just an example (can be changed in the future)
      return {
        type: "propose_alternative",
        intent,
        state: clonedBelief,
      };
    }

    // 2. Regla: "always" → pedir confirmación a menos que ya esté confirmada
    if (intent.requiresConfirmation === "always") {
      if (intent.signals?.isConfirmed) {
        return {
          type: "execute",
          intent,
          action: this.mapIntentToWorkflow(intent.intentKey),
          state: this.markAsExecuted(clonedBelief, intent),
        };
      }
      if (intent.signals?.isRejected) {
        return {
          type: "propose_alternative",
          intent,
          state: clonedBelief,
        };
      }
      // isUncertain = "no se" | "talvez" | "puede ser"
      if (intent.signals?.isUncertain) {
        return {
          type: "clear_up_uncertainty",
          intent,
          state: clonedBelief,
        };
      }
      if (!intent.signals?.isConfirmed) {
        return {
          type: "ask_confirmation",
          intent,
          state: clonedBelief,
        };
      }
    }

    // Fallback seguro (no debería ocurrir si tus intents están bien definidos)
    // ¿Te refieres a:
    // • Las capacidades que tengo (reservas, pedidos, info)
    // • O al menú de platos disponibles?
    // CREO que se deberia usar la lista de rsultados del RAG (intents mas cercanos)
    return {
      type: "ask_clarification",
      intent,
      state: clonedBelief,
    };
  }

  /**
   *
   * @todo remove when refactor is complete
   * @param intent
   * @returns
   */
  private mapIntentToWorkflow(intent: IntentExampleKey): IntentExampleKey {
    const map: Partial<Record<IntentExampleKey, string>> = {
      // Booking
      "booking:create": BookingOptions.MAKE_BOOKING,
      "booking:modify": BookingOptions.UPDATE_BOOKING,
      "booking:cancel": BookingOptions.CANCEL_BOOKING,
      "booking:check_availability": "booking:check_availability", // hay que implementar

      // Product
      "products:view": "products:view", // hay que implementar
      "products:find": "products:find", // hay que implementar
      "products:recommend": "products:recommend", // hay que implementar

      "orders:create": "orders:create",
      "orders:modify": "orders:modify",
      "orders:cancel": "orders:cancel",

      // basicInformational
      "info:ask_location": "info:ask_location",
      "info:ask_business_hours": "info:business_hours",
      "info:ask_payment_methods": "info:ask_payment_methods",
      "info:ask_contact": "info:ask_contact",
      "info:ask_price": "info:ask_price",
      "info:ask_delivery_method": "info:ask_delivery_method",
      "info:ask_delivery_time": "info:ask_delivery_time",
    };

    const value = map[intent];
    if (!value) throw new Error(`Unknown intent: ${intent}`);
    console.log({ intent, value });
    return value as IntentExampleKey;
  }

  private markAsExecuted(
    state: BeliefState,
    intent: BeliefIntent,
  ): BeliefState {
    return {
      ...state,
      executedIntents: [...state.executedIntents, intent],
    };
  }
}
