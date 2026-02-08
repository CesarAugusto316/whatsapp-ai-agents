import { ModuleKind } from "../../rag.types";

// ============================================
// 1. NAMESPACE POR DOMINIO (sin colisiones)
// ============================================
export type InformationalIntentKey =
  | "info:ask_price"
  | "info:ask_location"
  | "info:ask_hours"
  | "info:ask_payment_methods"
  | "info:ask_contact";

export type BookingIntentKey =
  | "booking:create"
  | "booking:modify"
  | "booking:cancel"
  | "booking:check_availability";

export type RestaurantIntentKey =
  | "restaurant:view_menu"
  | "restaurant:place_order"
  | "restaurant:ask_delivery_time"
  | "restaurant:ask_delivery_method";

export type EroticIntentKey =
  | "erotic:view_content"
  | "erotic:purchase_content"
  | "erotic:ask_services";

export type IntentKey =
  | InformationalIntentKey
  | RestaurantIntentKey
  | BookingIntentKey
  | EroticIntentKey;

// ============================================
// 2. BELIEF STATE (Estado de Creencia)
// ============================================
export interface BeliefIntent {
  key: IntentKey; // ej: "info:ask_price" | "restaurant:view_menu"
  probability: number; // 0.0 - 1.0

  evidence: number; // +1 cada vez que se confirma
  rejected: number; // +1 cada vez que se rechaza

  lastSeen: number; // timestamp última aparición
  decayRate?: number; // opcional: qué tan rápido "olvida"
}

export interface BeliefState {
  intents: Record<string, BeliefIntent>;

  dominant?: string; // intención más probable

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

// ============================================
// 3. CONVERSATIONAL SIGNALS (no son intents, do not need vectorize)
// ============================================

export type ConversationalSignal =
  | "affirmation" // sí, ok, dale
  | "negation" // no, no quiero
  | "uncertainty" // no sé, tal vez
  | "request_help" // ayuda, no entiendo
  | "request_human"; // hablar con persona

// ============================================
// 4. OBSERVATION CON SIGNALS
// ============================================

export type Observation = {
  // Mensaje del usuario
  text: string;

  // Resultados RAG (intenciones detectadas)
  intentResults: Array<{
    intent: IntentKey;
    module: ModuleKind;
    score: number;
  }>;

  // Señales conversacionales detectadas
  signals: {
    isAffirmation: boolean;
    isNegation: boolean;
    isUncertain: boolean;
    needsHelp: boolean;
    wantsHuman: boolean;
  };

  // Contexto del sistema
  context: {
    hasActiveBooking: boolean;
    hasOrderInProgress: boolean;
    previousDominantIntent?: string;
    conversationTurns: number;
  };
};
