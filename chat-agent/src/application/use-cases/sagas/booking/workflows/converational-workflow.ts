import type { RestaurantCtx } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import type { BookingResult } from "../booking-saga";
import { attachProcessReminder } from "@/application/patterns";
import {
  conversationalPrompt,
  systemMessages,
} from "@/domain/restaurant/booking/prompts";
import { ragService } from "@/application/services/rag";
import type {
  IntentPayload,
  QuadrantPoint,
} from "@/infraestructure/adapters/vector-store";
import {
  PomdpManager,
  shouldSkipProcessing,
} from "@/application/services/pomdp";
import { logger } from "@/infraestructure/logging";
import { formatSagaOutput } from "../helpers/format-saga-output";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 */
export async function conversationalWorkflow(
  ctx: RestaurantCtx,
): Promise<BookingResult> {
  //
  let matchedIntents: QuadrantPoint<IntentPayload>[] = [];
  const { skip, kind } = shouldSkipProcessing(ctx.customerMessage);

  // skip RAG, to save resources
  if (skip && kind === "social-protocol") {
    // 1. INTENT SEARCH

    return formatSagaOutput("Hola");
  }

  const { points } = await ragService.searchIntent(
    ctx.customerMessage,
    ctx.activeModules, // ["informational", "booking", "restaurant"],
  );
  /**
   *
   * -IMPLEMENT THIS FEATURE IN THE FUTURE IS NOT URGENT NOW
   * @todo notify CMS about unhandled intents
   * Si no se detectó un intent confiable/preciso
   *
   * @example
   * cmsAdapter.sendQuestionForReview(businessId, payload)
   */
  matchedIntents = points ?? [];
  logger.info("intentPoints", matchedIntents);

  const {
    beliefState,
    policyDecision,
    recommendedIntent,
    confidenceMetrics,
    topIntents,
  } = await new PomdpManager().process(
    ctx,
    matchedIntents.map(({ payload, score }) => ({
      intent: payload?.intent,
      module: payload?.module,
      score: score,
    })),
  );

  let messages: ChatMessage[] = [];
  const chatHistoryCache = await chatHistoryAdapter.get(ctx.chatKey);
  const isFirstMessage = chatHistoryCache.length === 0;
  if (isFirstMessage) {
    messages = [
      {
        role: "system",
        content: conversationalPrompt({
          business: ctx.business,
        }),
      },
      {
        role: "user",
        content: systemMessages.initialGreeting(
          ctx.customerMessage,
          ctx.customer?.name,
        ),
      },
    ] satisfies ChatMessage[];
  } //
  else {
    messages = [
      {
        role: "system",
        content: conversationalPrompt({
          business: ctx.business,
        }),
      },
      ...chatHistoryCache, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
      {
        role: "user",
        content: ctx.customerMessage,
      },
    ] satisfies ChatMessage[];
  }

  const assistant = await aiAdapter.generateText({
    messages,
  });

  /**
   *
   * @todo Replace for a better less mecanic approach if posible
   */
  const status = ctx.bookingState?.status;
  const reminderMSG = status
    ? attachProcessReminder(assistant, status, messages)
    : assistant;

  await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, assistant);
  return formatSagaOutput(reminderMSG);
}
