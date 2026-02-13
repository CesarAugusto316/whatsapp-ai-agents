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
}

export interface BeliefState {
  executedIntents: BeliefIntent[];
  current?: BeliefIntent;
  previous?: BeliefIntent;
  isIntentFound: boolean;
  lastUpdate: number; // timestamp

  // Control de contexto
  // intentCorrections?: number; // corrección de intentos (cuando salta de un intento a otro)
}
