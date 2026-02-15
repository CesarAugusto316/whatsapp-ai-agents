import { IntentPayload } from "@/infraestructure/adapters/vector-store";
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
}

export interface BeliefState {
  // we use top result beacause we may need
  // the most similar intents + example text for clarification
  topResults: IntentPayload[];
  executedIntents: BeliefIntent[];
  current?: BeliefIntent;
  previous?: BeliefIntent;
  isIntentFound: boolean;
  lastUpdate: number; // timestamp
}
