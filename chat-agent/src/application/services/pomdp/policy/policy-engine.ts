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
  | { type: "ask_alternative"; dominant: BeliefIntent; state: BeliefState }
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
    if (!belief.isIntentFound || !current) {
      return { type: "unknown_intent", dominant: undefined, state: belief };
    }

    const clonedBelief = structuredClone(belief);

    // 1. Regla: "never" → ejecutar inmediatamente
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

    // 2. Regla: "maybe" → ejecutar si la confianza es alta, sino pedir confirmación
    if (
      current.requiresConfirmation === "maybe" &&
      current.score >= this.CONFIDENCE_THRESHOLD
    ) {
      return {
        type: "execute",
        dominant: current,
        saga: this.mapIntentToWorkflow(current.intent),
        state: this.markAsExecuted(clonedBelief, current),
      };
    }

    // 2. Regla: "always" → pedir confirmación a menos que ya esté confirmada
    if (current.requiresConfirmation === "always") {
      if (current.signals?.isConfirmed) {
        return {
          type: "execute",
          dominant: current,
          saga: this.mapIntentToWorkflow(current.intent),
          state: this.markAsExecuted(clonedBelief, current),
        };
      }
      if (current.signals?.isRejected) {
        return {
          type: "ask_alternative",
          dominant: current,
          state: this.markAsExecuted(clonedBelief, current),
        };
      }
      // isUncertain = "no se" | "talvez" | "puede ser" ó isConfirmed=false|null
      if (current.signals?.isUncertain || !current.signals?.isConfirmed) {
        return {
          type: "ask_confirmation",
          dominant: current,
          state: this.markAsExecuted(clonedBelief, current),
        };
      }
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
