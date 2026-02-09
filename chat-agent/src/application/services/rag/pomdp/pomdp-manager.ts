import { BeliefUpdater } from "./belief/belief-updater";
import { buildObservation } from "./observation/build-observation";
import { PolicyEngine } from "./policy/policy-engine";
import { BeliefState } from "./belief/belief.types";
import { Observation } from "./observation/observation.types";
import { RestaurantCtx } from "@/domain/restaurant";
import { ModuleKind } from "../rag.types";
import { IntentExampleKey } from "./intents/intent.types";
import { cacheAdapter } from "@/infraestructure/adapters/cache";

export type PomdpActionResult =
  | { type: "clarify"; question: string; beliefState: BeliefState }
  | { type: "confirm"; intent: string; beliefState: BeliefState }
  | { type: "execute"; intent: string; saga: string; beliefState: BeliefState }
  | { type: "fallback"; reason: string; beliefState: BeliefState }
  | { type: "continue"; response: string; beliefState: BeliefState }; // For cases where we continue with AI response

export class PomdpManager {
  private beliefUpdater: BeliefUpdater;
  private policyEngine: PolicyEngine;

  constructor() {
    this.beliefUpdater = new BeliefUpdater();
    this.policyEngine = new PolicyEngine();
  }

  /**
   * Process user input through the POMDP pipeline
   */
  async process(
    ctx: RestaurantCtx,
    ragResults: Array<{
      intent: IntentExampleKey;
      module: ModuleKind;
      score: number;
    }>,
  ): Promise<PomdpActionResult> {
    // Load previous belief state from cache, or create empty one
    let currentBeliefState = ctx.beliefState || BeliefUpdater.createEmpty();

    // Build observation from user input and RAG results
    // const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);
    const systemContext = {
      hasActiveBooking: Boolean(ctx.bookingState?.status),
      hasOrderInProgress: Boolean(ctx.productOrderState),
      previousDominantIntent: currentBeliefState.dominant,
      conversationTurns: currentBeliefState.conversationTurns,
    };

    const observation: Observation = buildObservation(
      ctx.customerMessage,
      ragResults,
      systemContext,
    );

    // Update belief state based on observation
    const updatedBeliefState = this.beliefUpdater.update(
      currentBeliefState,
      observation,
    );

    // Decide on action based on updated belief state
    const action = this.policyEngine.decide(updatedBeliefState, ctx);

    // Save updated belief state to cache
    await cacheAdapter.save(ctx.beliefKey, updatedBeliefState, 60 * 60 * 24); // 24 hours TTL

    // Return appropriate result based on action
    switch (action.type) {
      case "clarify":
        return {
          type: "clarify",
          question: action.question,
          beliefState: updatedBeliefState,
        };
      case "confirm":
        return {
          type: "confirm",
          intent: action.intent,
          beliefState: updatedBeliefState,
        };
      case "execute":
        return {
          type: "execute",
          intent: action.intent,
          saga: action.saga,
          beliefState: updatedBeliefState,
        };
      case "fallback":
        return {
          type: "fallback",
          reason: action.reason,
          beliefState: updatedBeliefState,
        };
      default:
        // For any other case, return a continue action with the belief state
        return {
          type: "continue",
          response: "¿En qué más puedo ayudarte?",
          beliefState: updatedBeliefState,
        };
    }
  }
}
