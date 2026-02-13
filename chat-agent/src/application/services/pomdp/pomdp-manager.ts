import { BeliefStateUpdater } from "./belief/belief-updater";
import { PolicyDecision, PolicyEngine } from "./policy/policy-engine";
import { BeliefIntent, BeliefState } from "./belief/belief.types";
import { RestaurantCtx } from "@/domain/restaurant";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { IntentPayload } from "@/infraestructure/adapters/vector-store";

export type PomdpResult = {
  policyDecision: PolicyDecision;
  beliefState: BeliefState;
  currentIntent?: BeliefIntent;
};

export interface PayloadWithScore extends Pick<
  IntentPayload,
  "intent" | "module" | "requiresConfirmation"
> {
  score: number;
}

class PomdpManager {
  private beliefUpdater: BeliefStateUpdater;
  private policyEngine: PolicyEngine;

  constructor() {
    this.beliefUpdater = new BeliefStateUpdater();
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
    const previousBeliefState =
      ctx.beliefState || BeliefStateUpdater.createEmpty();

    // Update belief state based on observation
    const newBeliefState = this.beliefUpdater.update(
      previousBeliefState,
      ragResults.at(0),
    );

    // Decide on action based on updated belief state
    // const hasResults = ragResults.length > 0;
    const policyDecision = this.policyEngine.decide(newBeliefState);

    // Save updated belief state to cache
    await cacheAdapter.save<BeliefState>(
      ctx.beliefKey,
      policyDecision.state,
      60 * 60 * 24,
    ); // 24 hours TTL

    // Return structured result for LLM to generate response
    return {
      currentIntent: newBeliefState.current,
      policyDecision,
      beliefState: newBeliefState,
    };
  }
}

export const pomdpManager = new PomdpManager();
