import { ModuleKind } from "../../rag.types";
import { IntentKey } from "../intents/intent.types";
import { conversationalPatterns } from "../intents/intents";
import { Observation } from "./observation.types";

// ============================================
// 1. HELPER PARA CONSTRUIR OBSERVATION
// ============================================
export function buildObservation(
  userMessage: string,
  ragResults: Array<{ intent: IntentKey; module: ModuleKind; score: number }>,
  systemContext: {
    hasActiveBooking: boolean;
    hasOrderInProgress: boolean;
    previousDominantIntent?: string;
    conversationTurns: number;
  },
): Observation {
  const msg = userMessage.toLowerCase();

  return {
    text: userMessage,

    intentResults: ragResults.map((r) => ({
      intent: r.intent,
      module: r.module,
      // module: r.intent.split(":")[0],  // orginal code by claude from anthrophic
      score: r.score,
    })),

    signals: {
      isAffirmation: conversationalPatterns.affirmation.test(msg),
      isNegation: conversationalPatterns.negation.test(msg),
      isUncertain: conversationalPatterns.uncertainty.test(msg),
      needsHelp: conversationalPatterns.request_help.test(msg),
      wantsHuman: conversationalPatterns.request_human.test(msg),
    },

    context: systemContext,
  };
}
