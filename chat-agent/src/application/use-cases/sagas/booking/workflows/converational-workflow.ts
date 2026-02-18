import type { DomainCtx } from "@/domain/booking";
import type { BookingSagaResult } from "../booking-saga";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { initialOptionsWorkflow } from "./initial-options-workflow";
import {
  InformationalIntentKey,
  pomdpManager,
  SocialProtocolIntent,
} from "@/application/services/pomdp";
import {
  intentClassifierPrompt,
  businessInfoChunck,
  getRandomOnboardingMsg,
  socialProtocolChunk,
} from "@/domain/booking";
import { aiAdapter } from "@/infraestructure/adapters/ai";
import { formatSagaOutput } from "@/application/patterns";
import { logger } from "@/infraestructure/logging";

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
  ctx: DomainCtx,
): Promise<BookingSagaResult> {
  //
  // 1. generating the policy decision
  const policy = await pomdpManager.process(ctx);

  // 2. handling intent execution
  if (policy.type === "execute") {
    const { intent } = policy;
    const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);
    const isFirstMessage = chatHistory.length === 0;
    const isCustomer = Boolean(ctx.customer);
    //
    if (isFirstMessage && !isCustomer) {
      const ONBOARDING_MSG = getRandomOnboardingMsg(ctx);
      await chatHistoryAdapter.push(
        ctx.chatKey,
        ctx.customerMessage,
        ONBOARDING_MSG,
      );
      return formatSagaOutput(
        ONBOARDING_MSG,
        `${intent?.intentKey}-${policy.type}`, // optional
        policy,
      );
    }

    if (intent.module === "social-protocol") {
      const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);
      const isFirstMessage = chatHistory.length === 0;
      //
      if (intent.intentKey === "social:greeting" && isFirstMessage) {
        const ONBOARDING_MSG = getRandomOnboardingMsg(ctx);
        await chatHistoryAdapter.push(
          ctx.chatKey,
          ctx.customerMessage,
          ONBOARDING_MSG,
        );
        return formatSagaOutput(
          ONBOARDING_MSG,
          `${intent?.intentKey}:${policy.type}`, // optional
          policy,
        );
      }

      const ASSISTANT_MSG = await aiAdapter.handleChatMessage({
        systemPrompt: socialProtocolChunk(
          intent?.intentKey as SocialProtocolIntent,
          ctx,
        ),
        msg: ctx.customerMessage,
        chatHistory,
        useAuxModel: true,
      });
      await chatHistoryAdapter.push(
        ctx.chatKey,
        ctx.customerMessage,
        ASSISTANT_MSG,
      );
      return formatSagaOutput(
        ASSISTANT_MSG,
        `${intent?.intentKey}-${policy.type}`, // optional
        policy,
      );
    }

    if (intent.module === "informational") {
      const key = intent.intentKey as InformationalIntentKey;
      const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);
      const systemPrompt = businessInfoChunck(key, ctx);
      const ASSISTANT_MSG = await aiAdapter.handleChatMessage({
        systemPrompt,
        msg: ctx.customerMessage,
        chatHistory,
        useAuxModel: true,
      });
      await chatHistoryAdapter.push(
        ctx.chatKey,
        ctx.customerMessage,
        ASSISTANT_MSG,
      );
      return formatSagaOutput(
        ASSISTANT_MSG,
        `${intent?.intentKey}-${policy.type}`, // optional
        { policy, systemPrompt },
      );
    }

    if (intent.module === "booking") {
      //
      const res = await initialOptionsWorkflow(ctx, policy.action);
      if (res) return res;
    }

    if (intent.module === "products") {
      //
    }
    if (intent.module === "orders") {
      //
    }
  }

  // 3. handling intent feedback
  const chatHistory = await chatHistoryAdapter.get(ctx.chatKey);
  // Agregar este log mínimo para validar en producción
  const systemPrompt = intentClassifierPrompt(ctx, policy);
  logger.info("PROMPT_GENERATED", {
    systemPrompt,
    businessType: ctx.business.general.businessType,
    activeModules: ctx.activeModules,
    policyType: policy.type,
    intentKey: policy.intent?.intentKey,
    timestamp: Date.now(),
  });
  const ASSISTANT_MSG = await aiAdapter.handleChatMessage({
    systemPrompt,
    msg: ctx.customerMessage,
    chatHistory,
  });
  await chatHistoryAdapter.push(
    ctx.chatKey,
    ctx.customerMessage,
    ASSISTANT_MSG,
  );

  return formatSagaOutput(
    ASSISTANT_MSG,
    `${policy.intent?.intentKey}-${policy.type}`, // optional
    { policy, systemPrompt },
  );
}
