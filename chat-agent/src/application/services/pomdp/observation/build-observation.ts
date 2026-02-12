import { BeliefState } from "../belief/belief.types";
import { conversationalSignals } from "../intents/conversational-signals";
import { PayloadWithScore } from "../pomdp-manager";
import { Observation } from "./observation.types";

// ============================================
// 1. HELPER PARA CONSTRUIR OBSERVATION
// ============================================
export function buildObservation(
  userMessage: string,
  ragResults: PayloadWithScore[],
  systemContext: {
    hasActiveBooking: boolean;
    hasOrderInProgress: boolean;
    previousDominantIntent?: BeliefState["dominant"];
    conversationTurns: number;
  },
): Observation {
  //
  const msg = userMessage.toLowerCase();
  return {
    text: userMessage,
    intentResults: ragResults,
    signals: {
      // take into account conversationalSignal vectors
      isAffirmation: conversationalSignals.affirmation.test(msg),
      isNegation: conversationalSignals.negation.test(msg),
      isUncertain: conversationalSignals.uncertainty.test(msg),
      needsHelp: conversationalSignals.request_help.test(msg),
      wantsHuman: conversationalSignals.request_human.test(msg),
    },
    context: systemContext,
  };
}
