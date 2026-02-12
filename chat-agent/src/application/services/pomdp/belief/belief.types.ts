import { IntentExampleKey } from "../intents/intent.types";
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

export interface SubIntent extends PayloadWithScore {
  parent?: string;
}

export interface BeliefState {
  executedIntents: SubIntent[];
  current?: BeliefIntent;
  previous?: BeliefIntent;

  // Control de contexto
  intentJumps: number; // turnos de conversación
  lastUpdate: number; // timestamp
}
