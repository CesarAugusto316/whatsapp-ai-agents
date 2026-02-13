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
      action: string;
      state: BeliefState;
    };

export class PolicyEngine {
  private readonly CONFIDENCE_THRESHOLD = 0.75; // esto se eliminaría porque sera responsabilidad de BeliefStateUpdater

  public decide(belief: BeliefState): PolicyDecision {
    const intent = belief.current;
    if (!belief.isIntentFound || !intent) {
      return { type: "unknown_intent", intent: undefined, state: belief };
    }

    const clonedBelief = structuredClone(belief);

    // 1. Regla: "never" → ejecutar inmediatamente
    if (
      intent.requiresConfirmation === "never" &&
      intent.score >= this.CONFIDENCE_THRESHOLD // esto debe salir y ser reemplazado por algo como isSafeToExecute
    ) {
      return {
        type: "execute",
        intent,
        action: this.mapIntentToWorkflow(intent.intent),
        state: this.markAsExecuted(clonedBelief, intent),
      };
    }

    // 2. Regla: "maybe" → ejecutar si la confianza es alta, sino pedir confirmación
    if (
      intent.requiresConfirmation === "maybe" &&
      intent.score >= this.CONFIDENCE_THRESHOLD // esto debe salir y ser reemplazado por algo como isSafeToExecute
    ) {
      return {
        type: "execute",
        intent,
        action: this.mapIntentToWorkflow(intent.intent),
        state: this.markAsExecuted(clonedBelief, intent),
      };
    }

    // 2. Regla: "always" → pedir confirmación a menos que ya esté confirmada
    if (intent.requiresConfirmation === "always") {
      if (intent.signals?.isConfirmed) {
        return {
          type: "execute",
          intent,
          action: this.mapIntentToWorkflow(intent.intent),
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
    return {
      type: "ask_clarification",
      intent,
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
