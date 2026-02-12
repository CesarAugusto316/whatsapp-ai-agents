import { BeliefState } from "../belief/belief.types";
import { PayloadWithScore } from "../pomdp-manager";

// ============================================
// 1. OBSERVATION CON SIGNALS
// ============================================
export type Observation = {
  // Mensaje del usuario
  text: string;

  // Resultados RAG (intenciones detectadas)
  intentResults: PayloadWithScore[];

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
    previousDominantIntent?: BeliefState["dominant"];
    conversationTurns: number;
  };
};
