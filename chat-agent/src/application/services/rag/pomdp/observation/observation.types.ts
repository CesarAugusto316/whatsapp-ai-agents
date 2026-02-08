import { ModuleKind } from "../../rag.types";
import { IntentKey } from "../intents/intent.types";

// ============================================
// 1. OBSERVATION CON SIGNALS
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
