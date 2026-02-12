import { PayloadWithScore } from "../pomdp-manager";

// ============================================
// 1. BELIEF STATE (Estado de Creencia)
// ============================================
export interface BeliefIntent extends PayloadWithScore {
  signals: {
    isConfirmed?: boolean; // true si el usuario dijo "sí" explícitamente
    isUncertain?: boolean;
    isRejected?: boolean; // true si el usuario dijo "no" explícitamente
  };
}

export interface BeliefState {
  executedIntents: BeliefIntent[];
  current?: BeliefIntent;
  previous?: BeliefIntent;

  isIntentFound: boolean;

  // Control de contexto
  intentJumps: number; // turnos de conversación
  lastUpdate: number; // timestamp
}
