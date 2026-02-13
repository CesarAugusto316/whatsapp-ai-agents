import { BeliefIntent, BeliefState } from "../belief/belief.types";
import {
  BookingOptions,
  ProductOrderOptions,
} from "@/domain/restaurant/booking";
import { IntentExampleKey } from "../intents/intent.types";

// ============================================
// POLICY ENGINE — Simple, legible, mantenible
// ============================================

export type PolicyDecision =
  | {
      type: "ask_clarification";
      dominant: BeliefIntent | undefined;
      state: BeliefState;
    }
  | {
      type: "unknown_intent";
      dominant: undefined;
      state: BeliefState;
    }
  | { type: "ask_confirmation"; dominant: BeliefIntent; state: BeliefState }
  | {
      type: "execute";
      dominant: BeliefIntent;
      saga: string;
      state: BeliefState;
    };

export class PolicyEngine {
  private readonly CONFIDENCE_THRESHOLD = 0.75;

  public decide(belief: BeliefState): PolicyDecision {
    const current = belief.current;
    if (!current || !belief.isIntentFound) {
      return { type: "unknown_intent", dominant: undefined, state: belief };
    }

    const clonedBelief = structuredClone(belief);

    // 1. Si la confianza es baja → clarificar (para cualquier intencion)
    if (current.score < this.CONFIDENCE_THRESHOLD) {
      return {
        type: "ask_clarification",
        dominant: current,
        state: clonedBelief,
      };
    }

    // 2. Regla: "never" → ejecutar inmediatamente
    if (
      current.requiresConfirmation === "never" &&
      current.score >= this.CONFIDENCE_THRESHOLD
    ) {
      return {
        type: "execute",
        dominant: current,
        saga: this.mapIntentToWorkflow(current.intent),
        state: this.markAsExecuted(clonedBelief, current),
      };
    }

    // 3. Regla: "always" → pedir confirmación a menos que ya esté confirmada
    if (current.requiresConfirmation === "always") {
      if (current.signals?.isConfirmed) {
        return {
          type: "execute",
          dominant: current,
          saga: this.mapIntentToWorkflow(current.intent),
          state: this.markAsExecuted(clonedBelief, current),
        };
      }
      return {
        type: "ask_confirmation",
        dominant: current,
        state: clonedBelief,
      };
    }

    // 4. Regla: "maybe" → ejecutar directo (confirmación implícita por contexto)
    //    Nota: en tu sistema, las señales ya actualizaron `signals` si aplica.
    //    Pero como "maybe" no exige confirmación estricta, ejecutamos.
    if (current.requiresConfirmation === "maybe") {
      return {
        type: "execute",
        dominant: current,
        saga: this.mapIntentToWorkflow(current.intent),
        state: this.markAsExecuted(clonedBelief, current),
      };
    }

    // Fallback seguro (no debería ocurrir si tus intents están bien definidos)
    return {
      type: "ask_clarification",
      dominant: current,
      state: clonedBelief,
    };
  }

  private mapIntentToWorkflow(intent: IntentExampleKey): string {
    const map: Partial<Record<IntentExampleKey, string>> = {
      // Booking
      "booking:create": BookingOptions.MAKE_BOOKING,
      "booking:modify": BookingOptions.UPDATE_BOOKING,
      "booking:cancel": BookingOptions.CANCEL_BOOKING,
      "booking:check_availability": "booking:check_availability", // hay que implementar

      // Restaurant
      "restaurant:place_order": ProductOrderOptions.MAKE_PRODUCT_ORDER,
      "restaurant:update_order": ProductOrderOptions.UPDATE_PRODUCT_ORDER,
      "restaurant:cancel_order": ProductOrderOptions.CANCEL_PRODUCT_ORDER,
      "restaurant:view_menu": "restaurant:view_menu", // hay que implementar
      "restaurant:find_dishes": "restaurant:find_dishes", // hay que implementar
      "restaurant:ask_delivery_method": "restaurant:ask_delivery_method", // hay que implementar
      "restaurant:ask_delivery_time": "restaurant:ask_delivery_time", // hay que implementar
      "restaurant:ask_price": "restaurant:ask_price", // hay que implementar
    };

    return map[intent] ?? "unknown_intent";
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
