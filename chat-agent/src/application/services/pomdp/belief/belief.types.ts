import { IntentExampleKey } from "../intents/intent.types";

// ============================================
// 1. BELIEF STATE (Estado de Creencia)
// ============================================
export interface BeliefIntent {
  key: IntentExampleKey; // ej: "info:ask_price" | "restaurant:view_menu"
  probability: number; // 0.0 - 1.0

  evidence: number; // +1 cada vez que se confirma
  rejected: number; // +1 cada vez que se rechaza

  lastSeen: number; // timestamp última aparición
  decayRate?: number; // opcional: qué tan rápido "olvida"
}

export interface BeliefState {
  intents: Record<string, BeliefIntent>;

  dominant?: IntentExampleKey; // intención más probable

  // Métricas de incertidumbre
  entropy: number; // qué tan confuso está (0=seguro, 1=muy confuso)
  confidence: number; // confianza en dominant (0-1)

  // Control de contexto
  conversationTurns: number; // turnos de conversación
  lastUpdate: number; // timestamp

  // Flags de comportamiento
  needsClarification: boolean; // debe preguntar al usuario
  isStuck: boolean; // lleva muchos turnos sin avanzar
}
