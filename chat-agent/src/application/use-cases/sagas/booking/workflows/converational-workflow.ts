import type { RestaurantCtx } from "@/domain/restaurant";
import type { BookingResult } from "../booking-saga";
import { ragService } from "@/application/services/rag";
import {
  InformationalIntentKey,
  pomdpManager,
  shouldSkipProcessing,
  SocialProtocolIntent,
} from "@/application/services/pomdp";
import { formatSagaOutput } from "../helpers/format-saga-output";
import { IntentPayloadWithScore } from "@/application/services/pomdp/pomdp-manager";
import { generateIntentPrompt } from "./helpers/prompts";
import { businessInfoChunck } from "./helpers/business-info-chunk";
import { handleMessageProcessing } from "./helpers/prepare-messages";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import {
  getRandomOnboardingMsg,
  socialProtocolChunk,
} from "./helpers/social-chunks";

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
  // TODO: skip RAG for "booking" | "restaurant" etc.. by user REGEX
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

  // 1. generating the policy decision
  const policyDecision = await pomdpManager.process(ctx, ragResults);

  // 2. handling intent execution
  if (policyDecision.type === "execute") {
    const { intent } = policyDecision;
    const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);
    const isFirstMessage = chatHistory.length === 0;
    const isCustomer = Boolean(ctx.customer);
    //
    if (isFirstMessage && !isCustomer) {
      const {
        business: { assistantName, name },
      } = ctx;
      const assistantMsg = getRandomOnboardingMsg(assistantName, name);
      await chatHistoryAdapter.push(
        ctx.chatKey,
        ctx.customerMessage,
        assistantMsg,
      );
      return formatSagaOutput(
        assistantMsg,
        `${intent?.intentKey}:${policyDecision.type}`, // optional
      );
    }

    if (intent.module === "social-protocol") {
      const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);
      const isFirstMessage = chatHistory.length === 0;
      //
      if (intent.intentKey === "social:greeting" && isFirstMessage) {
        const {
          business: { assistantName, name },
        } = ctx;
        const assistantMsg = getRandomOnboardingMsg(assistantName, name);
        await chatHistoryAdapter.push(
          ctx.chatKey,
          ctx.customerMessage,
          assistantMsg,
        );
        return formatSagaOutput(
          assistantMsg,
          `${intent?.intentKey}:${policyDecision.type}`, // optional
        );
      }

      const useAuxModel = true;
      const assistantMsg = await handleMessageProcessing(
        () =>
          socialProtocolChunk(
            intent?.intentKey as SocialProtocolIntent,
            ctx.business,
          ),
        ctx.customerMessage,
        chatHistory,
        useAuxModel,
      );
      await chatHistoryAdapter.push(
        ctx.chatKey,
        ctx.customerMessage,
        assistantMsg,
      );
      return formatSagaOutput(
        assistantMsg,
        `${intent?.intentKey}:${policyDecision.type}`, // optional
      );
    }

    if (intent.module === "informational") {
      const key = intent.intentKey as InformationalIntentKey;
      const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);
      const assistantMsg = await handleMessageProcessing(
        () => businessInfoChunck(key, ctx.business),
        ctx.customerMessage,
        chatHistory,
        true,
      );
      await chatHistoryAdapter.push(
        ctx.chatKey,
        ctx.customerMessage,
        assistantMsg,
      );
      return formatSagaOutput(
        assistantMsg,
        `${intent?.intentKey}:${policyDecision.type}`, // optional
      );
    }

    if (intent.module === "booking") {
      //
    }

    if (intent.module === "restaurant") {
      //
    }
  }

  // 3. handling intent feedback
  const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);
  const assistantMsg = await handleMessageProcessing(
    () => generateIntentPrompt(ctx, policyDecision),
    ctx.customerMessage,
    chatHistory,
  );
  await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, assistantMsg);

  return formatSagaOutput(
    assistantMsg,
    `${policyDecision.intent?.intentKey}:${policyDecision.type}`, // optional
  );
}
