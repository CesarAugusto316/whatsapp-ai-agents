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
  | { type: "ask_clarification"; dominant: BeliefState["dominant"] }
  | { type: "ask_confirmation"; dominant: BeliefState["dominant"] }
  | { type: "execute"; dominant: BeliefState["dominant"]; saga: string }
  | { type: "default"; dominant: BeliefState["dominant"] };

// 🧠 Bonus: Policy Engine puede decidir qué modelo usar

export class PolicyEngine {
  public decide(belief: BeliefState): PolicyDecision {
    // 1. Si está atascado → default
    if (belief.isStuck) {
      return {
        type: "default",
        dominant: belief.dominant,
      };
    }

    // 2. Si hay alta incertidumbre → SIEMPRE clarificar (independiente del riesgo)
    if (belief.needsClarification && belief.dominant) {
      return {
        type: "ask_clarification",
        dominant: belief.dominant,
      };
    }

    // 3. Si hay intención dominante clara → aplicar lógica por riesgo
    if (belief.dominant && belief.confidence > 0.7) {
      const dominantIntent = belief.dominant;
      const intentBelief = belief.intents[dominantIntent.intent];

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
        if (intentBelief.evidence > 2) {
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
        if (intentBelief.evidence <= 1) {
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
      dominant: belief.dominant || {
        intent: "signal:uncertainty" as IntentExampleKey,
        requiresConfirmation: "never",
      },
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

// export class PolicyEngine {
//   public decide(belief: BeliefState, context: RestaurantCtx): PolicyDecision {
//     // 1. Si está atascado → default a humano o resetear
//     if (belief.isStuck) {
//       return {
//         type: "default",
//         dominant: belief.dominant,
//       };
//     }

//     // 2. Si hay alta incertidumbre → clarificar
//     if (belief.needsClarification && belief.dominant) {
//       // return this.generateClarification(belief);
//       return {
//         type: "ask_clarification",
//         dominant: belief.dominant,
//       };
//     }

//     // 3. Si hay intención dominante clara → confirmar o ejecutar
//     if (belief.dominant && belief.confidence > 0.8) {
//       // Si es primera vez que aparece con alta confianza → confirmar
//       const intent = belief.intents[belief.dominant.intent];
//       if (intent.evidence <= 2) {
//         return {
//           type: "ask_confirmation",
//           dominant: belief.dominant,
//         };
//       }

//       // Si ya fue confirmado → ejecutar
//       return {
//         type: "execute",
//         dominant: belief.dominant,
//         saga: this.mapIntentToWorkflow(belief.dominant.intent),
//         // 🧠 Bonus: Policy Engine puede decidir qué modelo usar

//         // structuredAction: {
//         //   action: "search_products",
//         //   params: { query: extractQuery(ctx.customerMessage) },
//         // },
//         // // ✨ Metadata para routing de modelo
//         // responseMetadata: {
//         //   requiresLLM: true,
//         //   modelTier: "light", // ← Granite-4.0-h-micro
//         //   maxTokens: 30,
//         // },
//       };
//     }

//     // 4. Default: hacer pregunta abierta
//     return {
//       type: "ask_clarification",
//       dominant: belief.dominant,
//     };
//   }

//   /**
//    * @todo map more intents -> workFlowOptions | tool_call | read cached_business_info
//    * @param intent
//    * @returns
//    */
//   private mapIntentToWorkflow(intent: IntentExampleKey): string {
//     // RestaurantIntentKey| BookingIntentKey
//     const map: Partial<Record<IntentExampleKey, string>> = {
//       "booking:create": BookingOptions.MAKE_BOOKING, // deterministic workflow
//       "booking:modify": BookingOptions.UPDATE_BOOKING,
//       "booking:cancel": BookingOptions.CANCEL_BOOKING,
//       "booking:check_availability": "booking:check_availability", // tool_call

//       "restaurant:place_order": ProductOrderOptions.MAKE_PRODUCT_ORDER, // deterministic workflow
//       "restaurant:update_order": ProductOrderOptions.UPDATE_PRODUCT_ORDER,
//       "restaurant:cancel_order": ProductOrderOptions.CANCEL_PRODUCT_ORDER,
//       "restaurant:ask_delivery_method": "restaurant:ask_delivery_method", // read cached_business_info
//       "restaurant:ask_delivery_time": "restaurant:ask_delivery_time",
//       "restaurant:view_menu": "restaurant:view_menu",
//       "restaurant:find_dishes": "restaurant:find_dishes",
//       "restaurant:ask_price": "restaurant:ask_price",
//     };

//     return map[intent] as string;
//   }
// }
