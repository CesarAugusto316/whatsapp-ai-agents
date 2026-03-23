import { IntentPayloadWithScore } from "../pomdp-manager";

// ============================================
// 1. BELIEF STATE (Estado de Creencia)
// ============================================
export interface BeliefIntent extends IntentPayloadWithScore {
  signals: {
    isConfirmed: boolean; // true si el usuario dijo "sí" explícitamente
    isUncertain: boolean;
    isRejected: boolean; // true si el usuario dijo "no" explícitamente
  };
  isConfident: boolean;
  alternatives: IntentPayloadWithScore[];
}

export interface BeliefState {
  // comportamiento agregado de muchos usuarios
  aggregateContext?: {
    season?: "valentines" | "christmas" | "regular";
    userSegment?: "romantic_getaway" | "family" | "business";
    demandSignal?: "high" | "medium" | "low"; // basado en búsquedas recientes
  };
  // ... comportamiento de un usuario recurrente
  userContext?: {
    userId: string;
    preferences?: {
      favoriteCategories?: string[];
      typicalOrderDay?: string;
      priceSensitivity?: "low" | "medium" | "high";
    };
    historySummary?: {
      totalOrders: number;
      lastOrderDate?: string;
      commonIntents: string[];
    };
  };
  // we use top result beacause we may need
  // the most similar intents + example text for clarification
  executedIntents: BeliefIntent[];
  current?: BeliefIntent;
  previous?: BeliefIntent;
  isIntentFound: boolean;
  lastUpdate: number; // timestamp
}
