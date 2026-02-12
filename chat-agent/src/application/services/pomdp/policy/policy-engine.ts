import { BeliefState } from "../belief/belief.types";
import { RestaurantCtx } from "@/domain/restaurant";
import {
  BookingOptions,
  ProductOrderOptions,
} from "@/domain/restaurant/booking";
import { IntentExampleKey } from "../intents/intent.types";

// ============================================
// 1. POLICY ENGINE (Decisiones)
// ============================================
export type PolicyDecision =
  | { type: "ask_clarification"; dominant: BeliefState["current"] }
  | { type: "ask_confirmation"; dominant: BeliefState["current"] }
  | { type: "execute"; dominant: BeliefState["current"]; saga: string }
  | { type: "default"; dominant: BeliefState["current"] };

// 🧠 Bonus: Policy Engine puede decidir qué modelo usar

export class PolicyEngine {
  public decide(belief: BeliefState): PolicyDecision {
    // 1. Si está atascado → default
    if (belief.isStuck) {
      return {
        type: "default",
        dominant: belief.current,
      };
    }

    // 2. Si hay alta incertidumbre → SIEMPRE clarificar (independiente del riesgo)
    if (belief.isStuck && belief.current) {
      return {
        type: "ask_clarification",
        dominant: belief.current,
      };
    }

    // 3. Si hay intención dominante clara → aplicar lógica por riesgo
    if (belief.current && !belief.isStuck) {
      const dominantIntent = belief.current;
      const intentBelief = belief.current;

      // 🔑 Regla 1: "never" → ejecutar directo (bajo riesgo, sin confirmación)
      if (dominantIntent.requiresConfirmation === "never") {
        return {
          type: "execute",
          dominant: dominantIntent,
          saga: this.mapIntentToWorkflow(dominantIntent.intent),
        };
      }

      // 🔑 Regla 2: "always" → SIEMPRE pedir confirmación (alto riesgo)
      if (dominantIntent.requiresConfirmation === "always") {
        if (intentBelief.signals.isConfirmed) {
          return {
            type: "execute",
            dominant: dominantIntent,
            saga: this.mapIntentToWorkflow(dominantIntent.intent),
          };
        }
        return {
          type: "ask_confirmation",
          dominant: dominantIntent,
        };
      }

      // 🔑 Regla 3: "maybe" → confirmar solo la primera vez
      if (dominantIntent.requiresConfirmation === "maybe") {
        // Primera señal → confirmar
        if (intentBelief.signals.isConfirmed) {
          return {
            type: "ask_confirmation",
            dominant: dominantIntent,
          };
        }

        // Segunda señal (confirmación explícita) → ejecutar
        return {
          type: "execute",
          dominant: dominantIntent,
          saga: this.mapIntentToWorkflow(dominantIntent.intent),
        };
      }
    }

    // 4. Default: clarificar
    return {
      type: "ask_clarification",
      dominant: belief.current,
    };
  }

  private mapIntentToWorkflow(intent: IntentExampleKey): string {
    const map: Partial<Record<IntentExampleKey, string>> = {
      "booking:create": BookingOptions.MAKE_BOOKING,
      "booking:modify": BookingOptions.UPDATE_BOOKING,
      "booking:cancel": BookingOptions.CANCEL_BOOKING,
      "booking:check_availability": "booking:check_availability",

      "restaurant:place_order": ProductOrderOptions.MAKE_PRODUCT_ORDER,
      "restaurant:update_order": ProductOrderOptions.UPDATE_PRODUCT_ORDER,
      "restaurant:cancel_order": ProductOrderOptions.CANCEL_PRODUCT_ORDER,
      "restaurant:ask_delivery_method": "restaurant:ask_delivery_method",
      "restaurant:ask_delivery_time": "restaurant:ask_delivery_time",
      "restaurant:view_menu": "restaurant:view_menu",
      "restaurant:find_dishes": "restaurant:find_dishes",
      "restaurant:ask_price": "restaurant:ask_price",
    };

    return map[intent] as string;
  }
}
