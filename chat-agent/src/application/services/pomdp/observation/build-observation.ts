import { conversationalSignals } from "../intents/conversational-signals";
import { IntentExampleKey, ModuleKind } from "../intents/intent.types";
import { Observation } from "./observation.types";

// ============================================
// 1. HELPER PARA CONSTRUIR OBSERVATION
// ============================================
export function buildObservation(
  userMessage: string,
  ragResults: Array<{
    intent: IntentExampleKey;
    module: ModuleKind;
    score: number;
  }>,
  systemContext: {
    hasActiveBooking: boolean;
    hasOrderInProgress: boolean;
    previousDominantIntent?: string;
    conversationTurns: number;
  },
): Observation {
  //
  const msg = userMessage.toLowerCase();
  return {
    text: userMessage,
    intentResults: ragResults.map((r) => ({
      intent: r.intent,
      module: r.module,
      score: r.score,
    })),
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
