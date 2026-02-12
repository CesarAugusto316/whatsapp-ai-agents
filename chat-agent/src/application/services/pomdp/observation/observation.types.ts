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
  };
};
