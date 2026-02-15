import { BeliefStateUpdater } from "./belief/belief-updater";
import { PolicyDecision, PolicyEngine } from "./policy/policy-engine";
import { BeliefIntent, BeliefState } from "./belief/belief.types";
import { RestaurantCtx } from "@/domain/restaurant";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { IntentPayload } from "@/infraestructure/adapters/vector-store";
import { shouldSkipProcessing } from "./intents/conversational-signals";
import { SocialProtocolIntent } from "./intents/intent.types";
import { ragService } from "../rag";
import { prioritizeIntents } from "./intents/prioritize-intents";

export type PomdpResult = {
  policyDecision: PolicyDecision;
  beliefState: BeliefState;
  currentIntent?: BeliefIntent;
};

export interface IntentPayloadWithScore extends Pick<
  IntentPayload,
  "intentKey" | "module" | "requiresConfirmation"
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
  async process(ctx: RestaurantCtx) {
    //
    let ragResults: IntentPayloadWithScore[] = [];
    const { skip, kind, msg } = shouldSkipProcessing(ctx.customerMessage);
  
    // skip RAG, to save resources by using simple REGEX
    if (skip && kind === "social-protocol") {
      ragResults = [
        {
          score: 1,
          module: "social-protocol",
          intentKey: msg as SocialProtocolIntent,
          requiresConfirmation: "never",
        } satisfies IntentPayloadWithScore,
      ];
    }
    if (skip && kind === "conversational-signal") {
      //  we know exactly the form for "conversational-signal" so we can skip RAG
      ragResults = [
        {
          score: 1,
          module: "conversational-signal",
          intentKey: msg as SocialProtocolIntent,
          requiresConfirmation: "never",
        } satisfies IntentPayloadWithScore,
      ];
    }
    // TODO: skip RAG for "booking" | "restaurant" etc.. by REGEX
    if (!skip) {
      const limit = 2;
      const { points } = await ragService.searchIntent(
        ctx.customerMessage,
        ctx.activeModules, // ej: ["informational", "booking", "restaurant"],
        limit,
      );
      ragResults = prioritizeIntents(
        points.map(({ payload, score }) => ({
          ...payload,
          score,
        })) ?? [],
      );
    }
   
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
    await cacheAdapter.save<BeliefState>(ctx.beliefKey, policyDecision.state); // 24 hours TTL

    // Return structured result for LLM to generate response
    return policyDecision;
  }
}

export const pomdpManager = new PomdpManager();
