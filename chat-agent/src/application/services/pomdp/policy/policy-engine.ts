import { BeliefState, SubIntent } from "../belief/belief.types";
import {
  BookingOptions,
  ProductOrderOptions,
} from "@/domain/restaurant/booking";
import { IntentExampleKey } from "../intents/intent.types";

// ============================================
// 1. POLICY ENGINE (Decisiones)
// ============================================
export type PolicyDecision =
  | {
      type: "ask_clarification";
      dominant: BeliefState["current"];
      state: BeliefState;
    }
  | {
      type: "ask_confirmation";
      dominant: BeliefState["current"];
      state: BeliefState;
    }
  | {
      type: "execute";
      dominant: BeliefState["current"];
      saga: string;
      state: BeliefState;
    }
  | { type: "default"; dominant: BeliefState["current"]; state: BeliefState };

// 🧠 Bonus: Policy Engine puede decidir qué modelo usar

export class PolicyEngine {
  public decide(belief: BeliefState): PolicyDecision {
    const beliefCopy = structuredClone(belief);

    // 2. Si hay alta incertidumbre → SIEMPRE clarificar (independiente del riesgo)
    if (
      belief.current?.requiresConfirmation === "always" &&
      belief.current.score < 0.7
    ) {
      return {
        type: "ask_clarification",
        dominant: belief.current,
        state: beliefCopy,
      };
    }

    // 3. Si hay intención dominante clara → aplicar lógica por riesgo
    if (belief.current) {
      const dominantIntent = belief.current;
      const signals = belief.current.signals;

      // 🔑 Regla 1: "never" → ejecutar directo (bajo riesgo, sin confirmación)
      if (dominantIntent.requiresConfirmation === "never") {
        return {
          type: "execute",
          dominant: dominantIntent,
          saga: this.mapIntentToWorkflow(dominantIntent.intent),
          state: this.addExecuted(beliefCopy, {
            parent: dominantIntent.intent,
            ...belief.current,
          }),
        };
      }

      // 🔑 Regla 2: "always" → SIEMPRE pedir confirmación (alto riesgo)
      if (dominantIntent.requiresConfirmation === "always") {
        if (signals.isConfirmed) {
          return {
            type: "execute",
            dominant: dominantIntent,
            saga: this.mapIntentToWorkflow(dominantIntent.intent),
            state: this.addExecuted(beliefCopy, {
              parent: dominantIntent.intent,
              ...belief.current,
            }),
          };
        }
        return {
          type: "ask_confirmation",
          dominant: dominantIntent,
          state: beliefCopy,
        };
      }

      // 🔑 Regla 3: "maybe" → confirmar solo la primera vez
      if (dominantIntent.requiresConfirmation === "maybe") {
        // Primera señal → confirmar
        if (signals.isConfirmed) {
          return {
            type: "ask_confirmation",
            dominant: dominantIntent,
            state: beliefCopy,
          };
        }

        // Segunda señal (confirmación explícita) → ejecutar
        return {
          type: "execute",
          dominant: dominantIntent,
          saga: this.mapIntentToWorkflow(dominantIntent.intent),
          state: this.addExecuted(beliefCopy, {
            parent: dominantIntent.intent,
            ...belief.current,
          }),
        };
      }
    }

    // 4. Default: clarificar
    return {
      type: "ask_clarification",
      dominant: belief.current,
      state: beliefCopy,
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

  private addExecuted(intent: BeliefState, subIntent: SubIntent): BeliefState {
    return {
      ...intent,
      executedIntents: [...intent.executedIntents, subIntent],
    };
  }
}
