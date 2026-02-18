import { BeliefStateUpdater } from "./belief/belief-updater";
import { PolicyDecision, PolicyEngine } from "./policy/policy-engine";
import { BeliefIntent, BeliefState } from "./belief/belief.types";
import { RestaurantCtx } from "@/domain/restaurant";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { IntentPayload } from "@/infraestructure/adapters/vector-store";
import { shouldSkipEmbedding } from "./intents/helpers/skip-embedding";
import { ModuleKind, SocialProtocolIntent } from "./intents/intent.types";
import { ragService } from "../rag";
import { prioritizeIntents } from "./intents/helpers/prioritize-intents";

export type PomdpResult = {
  policyDecision: PolicyDecision;
  beliefState: BeliefState;
  currentIntent?: BeliefIntent;
};

export interface IntentPayloadWithScore extends Pick<
  IntentPayload,
  "intentKey" | "module" | "requiresConfirmation" | "text"
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
    let mainIntent: IntentPayloadWithScore | undefined;
    let alternativeIntents: IntentPayloadWithScore[] = [];
    const { skip, kind, msg } = shouldSkipEmbedding(ctx.customerMessage);

    // skip RAG, to save resources by using simple REGEX
    if (skip && kind === "social-protocol") {
      mainIntent = {
        score: 1,
        module: "social-protocol",
        intentKey: msg as SocialProtocolIntent,
        text: "",
        requiresConfirmation: "never",
      } satisfies IntentPayloadWithScore;
    } //
    else if (skip && kind === "conversational-signal") {
      //  we know exactly the form for "conversational-signal" so we can skip RAG
      mainIntent = {
        score: 1,
        module: "conversational-signal",
        intentKey: msg as SocialProtocolIntent,
        text: "",
        requiresConfirmation: "never",
      } satisfies IntentPayloadWithScore;
    }
    // TODO: skip RAG for "booking" | "restaurant" etc.. by REGEX
    else if (!skip) {
      const limit = 4;
      const { points } = await ragService.searchIntent(
        ctx.customerMessage,
        ctx.activeModules, // ej: ["informational", "booking", "restaurant"],
        ctx.business.general.businessType,
        limit,
      );
      // topResults =
      const mappedPoints =
        points.map(({ payload, score }) => ({
          ...payload,
          score,
        })) ?? [];

      mainIntent = prioritizeIntents(mappedPoints.slice(0, 2)).at(0); // must not be "social protocol" but can be any other

      const excludedModules: ModuleKind[] = [
        "social-protocol",
        "conversational-signal",
      ];

      const uniqueIntents = [
        ...new Set(
          mappedPoints
            .filter(
              (item) =>
                !excludedModules.includes(item.module) ||
                item.intentKey !== mainIntent?.intentKey,
            )
            .map((item) => item.intentKey),
        ),
      ];

      // we need at least two alternatives
      // alternatives that are not the main intent or not excludedModules and are unique
      alternativeIntents = mappedPoints.filter((item) =>
        uniqueIntents.includes(item.intentKey),
      );
    }

    const previousBeliefState =
      ctx.beliefState || BeliefStateUpdater.createEmpty();

    // Update belief state based on observation
    const newBeliefState = this.beliefUpdater.update(
      previousBeliefState,
      alternativeIntents,
      mainIntent,
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
