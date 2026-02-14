import type { RestaurantCtx } from "@/domain/restaurant";
import type { BookingResult } from "../booking-saga";
import { ragService } from "@/application/services/rag";
import {
  pomdpManager,
  shouldSkipProcessing,
  SocialProtocolIntent,
} from "@/application/services/pomdp";
import { formatSagaOutput } from "../helpers/format-saga-output";
import { IntentPayloadWithScore } from "@/application/services/pomdp/pomdp-manager";
import { businesInfoPrompt, generateIntentPrompt } from "./helpers/prompts";
import { handleMessageProcessing } from "./helpers/prepare-messages";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 *
 * -IMPLEMENT THIS FEATURE IN THE FUTURE IS NOT URGENT NOW
 * @todo notify CMS about unhandled intents
 * Si no se detectó un intent confiable/preciso
 * @example
 * cmsAdapter.sendQuestionForReview(businessId, payload)
 */
export async function conversationalWorkflow(
  ctx: RestaurantCtx,
): Promise<BookingResult> {
  //
  let ragResults: IntentPayloadWithScore[] = [];
  const { skip, kind, msg } = shouldSkipProcessing(ctx.customerMessage);

  // skip RAG, to save resources
  if (skip && kind === "social-protocol") {
    return formatSagaOutput(msg); // saludar, despedirse, agradecer (reflejo simple)
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
  if (!skip) {
    const limit = 1;
    const { points } = await ragService.searchIntent(
      ctx.customerMessage,
      ctx.activeModules, // ej: ["informational", "booking", "restaurant"],
      limit,
    );
    ragResults =
      points.map(({ payload, score }) => ({
        ...payload,
        score,
      })) ?? [];
  }

  const policyDecision = await pomdpManager.process(ctx, ragResults);

  if (policyDecision.type === "execute") {
    //
    if (policyDecision.intent.module === "informational") {
      const assistantMsg = await handleMessageProcessing(
        () => businesInfoPrompt(ctx.business),
        ctx,
      );
      return formatSagaOutput(
        assistantMsg,
        `${policyDecision.intent?.intentKey}:${policyDecision.type}`, // optional
      );
      // else call the execute function
    }
  }

  const assistantMsg = await handleMessageProcessing(
    () => generateIntentPrompt(ctx, policyDecision),
    ctx,
  );
  return formatSagaOutput(
    assistantMsg,
    `${policyDecision.intent?.intentKey}:${policyDecision.type}`, // optional
  );
}
