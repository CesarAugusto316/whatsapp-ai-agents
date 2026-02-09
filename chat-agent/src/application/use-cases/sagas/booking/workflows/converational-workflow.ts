import type { RestaurantCtx } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import type { BookingResult } from "../booking-saga";
import { attachProcessReminder } from "@/application/patterns";
import {
  conversationalPrompt,
  systemMessages,
} from "@/domain/restaurant/booking/prompts";
import {
  shouldSkipProcessing,
  PomdpManager,
  ragService,
} from "@/application/services/rag";
import {
  IntentPayload,
  QuadrantPoint,
} from "@/infraestructure/adapters/vector-store";

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
  const chatHistoryCache = await chatHistoryAdapter.get(ctx.chatKey);

  /**
   * @todo implemnet better guardrails to prevent calling the ragService
   * only when necesary
   */
  const { skip, signal } = shouldSkipProcessing(ctx.customerMessage);

  // skip RAG, to save resources
  if (skip) {
    // 1. INTENT SEARCH
  } else {
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
  }

  console.log({ intentPoints: JSON.stringify(matchedIntents) });
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

  // 2. FLOW SELECTION & INITIALIZATION (pre-FSM)
  const isFirstMessage = chatHistoryCache.length === 0;
  if (isFirstMessage) {
    const messages: ChatMessage[] = [
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
    ];
    const assistantResponse = await aiAdapter.generateText({
      messages,
      useAuxModel: true,
    });
    return {
      bag: {},
      lastStepResult: {
        execute: {
          result: assistantResponse,
          metadata: {
            description: "INITIALIZATION, chatHistoryCache.length = 0",
            internal: `isFirstMessage=${isFirstMessage}`,
          },
        },
      },
    };
  }

  // 3. DEFAULT FALLBACK WITH AI AGENT FOR THE CHAT
  const messages: ChatMessage[] = [
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
  ];
  const assistantResponse = await aiAdapter.generateText({
    messages,
    useAuxModel: true,
  });

  /**
   *
   * @todo Replace for a better, less mecanic approach if posible
   */
  const status = ctx.bookingState?.status;
  const reminderMSG = status
    ? attachProcessReminder(assistantResponse, status, messages)
    : assistantResponse;

  return {
    bag: {},
    lastStepResult: {
      execute: {
        result: reminderMSG,
        metadata: {
          description: "",
          internal: ``,
        },
      },
    },
  };
}
