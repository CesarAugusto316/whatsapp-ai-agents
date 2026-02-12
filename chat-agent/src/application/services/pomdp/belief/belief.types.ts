import { IntentPayload } from "@/infraestructure/adapters/vector-store";
import {
  IntentExampleKey,
  RequiredConfirmation,
} from "../intents/intent.types";
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
  createdAt: number; // timestamp última aparición
}

export interface BeliefState {
  current?: BeliefIntent;
  previous?: BeliefIntent;

  isStuck?: boolean; // lleva muchos turnos sin avanzar

  // Control de contexto
  conversationTurns: number; // turnos de conversación
  lastUpdate: number; // timestamp
}
