import { BeliefUpdater } from "./belief/belief-updater";
import { buildObservation } from "./observation/build-observation";
import { PolicyDecision, PolicyEngine } from "./policy/policy-engine";
import { BeliefState } from "./belief/belief.types";
import { Observation } from "./observation/observation.types";
import { RestaurantCtx } from "@/domain/restaurant";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { IntentPayload } from "@/infraestructure/adapters/vector-store";
import { IntentExampleKey } from "./intents/intent.types";

export type PomdpResult = {
  policyDecision: PolicyDecision;
  beliefState: BeliefState;
  recommendedIntent?: BeliefState["dominant"];
  topIntents?: Array<{ intent: IntentExampleKey; probability: number }>;
  confidenceMetrics: {
    entropy: number;
    confidence: number;
  };
};

export interface PayloadWithScore extends Pick<
  IntentPayload,
  "intent" | "module" | "requiresConfirmation"
> {
  score: number;
}

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
    ragResults: PayloadWithScore[],
  ): Promise<PomdpResult> {
    //
    const previousBeliefState = ctx.beliefState || BeliefUpdater.createEmpty();

    const newObservation: Observation = buildObservation(
      ctx.customerMessage,
      ragResults,
    );

    // Update belief state based on observation
    const newBeliefState = this.beliefUpdater.update(
      previousBeliefState,
      newObservation,
    );

    // Decide on action based on updated belief state
    const policyDecision = this.policyEngine.decide(newBeliefState);

    // Save updated belief state to cache
    await cacheAdapter.save(ctx.beliefKey, newBeliefState, 60 * 60 * 24); // 24 hours TTL

    // Prepare top intents for context
    const topIntents = Object.entries(newBeliefState.intents)
      .sort(([_, a], [__, b]) => b.probability - a.probability)
      .slice(0, 3)
      .map(([intent, beliefIntent]) => ({
        intent: intent as IntentExampleKey,
        probability: beliefIntent.probability,
      }));

    // Return structured result for LLM to generate response
    return {
      policyDecision,
      beliefState: newBeliefState,
      recommendedIntent: newBeliefState.dominant,
      topIntents,
      confidenceMetrics: {
        entropy: newBeliefState.entropy,
        confidence: newBeliefState.confidence,
      },
    };
  }
}
