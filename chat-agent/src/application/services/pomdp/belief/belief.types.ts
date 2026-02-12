import {
  IntentExampleKey,
  RequiredConfirmation,
} from "../intents/intent.types";

// ============================================
// 1. BELIEF STATE (Estado de Creencia)
// ============================================
export interface BeliefIntent {
  key: IntentExampleKey; // ej: "info:ask_price" | "restaurant:view_menu"
  requiresConfirmation: RequiredConfirmation;
  probability: number; // 0.0 - 1.0

  evidence: number; // +1 cada vez que se confirma
  rejected: number; // +1 cada vez que se rechaza

  createdAt: number; // timestamp última aparición
  decayRate?: number; // opcional: qué tan rápido "olvida"
}

export interface BeliefState {
  intents: Record<string, BeliefIntent>;

  dominant?: {
    intent: IntentExampleKey;
    requiresConfirmation: RequiredConfirmation;
  }; // intención más probable

  // Métricas de incertidumbre
  entropy: number; // qué tan confuso está (0=seguro, 1=muy confuso)
  confidence: number; // confianza en dominant (0-1)

  // Flags de comportamiento
  needsClarification: boolean; // debe preguntar al usuario
  isStuck: boolean; // lleva muchos turnos sin avanzar

  // Control de contexto
  conversationTurns: number; // turnos de conversación
  lastUpdate: number; // timestamp
}
