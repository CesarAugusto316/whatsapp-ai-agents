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
  | { type: "ask_clarification"; intent: string }
  | { type: "ask_confirmation"; intent: string }
  | { type: "execute"; intent: string; saga: string }
  | { type: "fallback"; reason: string };

// 🧠 Bonus: Policy Engine puede decidir qué modelo usar

export class PolicyEngine {
  public decide(belief: BeliefState, context: RestaurantCtx): PolicyDecision {
    // 1. Si está atascado → fallback a humano o resetear
    if (belief.isStuck) {
      return {
        type: "fallback",
        reason: "conversation_stuck",
      };
    }

    // 2. Si hay alta incertidumbre → clarificar
    if (belief.needsClarification) {
      // return this.generateClarification(belief);
      return {
        type: "ask_clarification",
        intent: belief.dominant || "",
      };
    }

    // 3. Si hay intención dominante clara → confirmar o ejecutar
    if (belief.dominant && belief.confidence > 0.8) {
      // Si es primera vez que aparece con alta confianza → confirmar
      const intent = belief.intents[belief.dominant];
      if (intent.evidence <= 2) {
        return {
          type: "ask_confirmation",
          intent: belief.dominant,
        };
      }

      // Si ya fue confirmado → ejecutar
      return {
        type: "execute",
        intent: belief.dominant,
        saga: this.mapIntentToWorkflow(belief.dominant),
        // 🧠 Bonus: Policy Engine puede decidir qué modelo usar

        // structuredAction: {
        //   action: "search_products",
        //   params: { query: extractQuery(ctx.customerMessage) },
        // },
        // // ✨ Metadata para routing de modelo
        // responseMetadata: {
        //   requiresLLM: true,
        //   modelTier: "light", // ← Granite-4.0-h-micro
        //   maxTokens: 30,
        // },
      };
    }

    // 4. Default: hacer pregunta abierta
    return {
      type: "ask_clarification",
      intent: belief.dominant || "",
    };
  }

  /**
   * @todo map more intents -> workFlowOptions | tool_call | read cached_business_info
   * @param intent
   * @returns
   */
  private mapIntentToWorkflow(intent: IntentExampleKey): string {
    // RestaurantIntentKey| BookingIntentKey
    const map: Partial<Record<IntentExampleKey, string>> = {
      "booking:create": BookingOptions.MAKE_BOOKING, // deterministic workflow
      "booking:modify": BookingOptions.UPDATE_BOOKING,
      "booking:cancel": BookingOptions.CANCEL_BOOKING,
      "booking:check_availability": "booking:check_availability", // tool_call

      "restaurant:place_order": ProductOrderOptions.MAKE_PRODUCT_ORDER, // deterministic workflow
      "restaurant:update_order": ProductOrderOptions.UPDATE_PRODUCT_ORDER,
      "restaurant:cancel_order": ProductOrderOptions.CANCEL_PRODUCT_ORDER,
      "restaurant:ask_delivery_method": "restaurant:ask_delivery_method", // read cached_business_info
      "restaurant:ask_delivery_time": "restaurant:ask_delivery_time",
      "restaurant:view_menu": "restaurant:view_menu",
    };

    return map[intent] as string;
  }
}
