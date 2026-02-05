import { RestaurantCtx } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { ReservationResult } from "../reservation-saga";
import { attachProcessReminder } from "@/application/patterns";
import {
  conversationalPrompt,
  systemMessages,
} from "@/domain/restaurant/reservations/prompts";
import { ragService } from "@/application/services/rag";
import { cmsAdapter } from "@/infraestructure/adapters/cms";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 */
export async function conversationalWorkflow(
  ctx: RestaurantCtx,
): Promise<ReservationResult> {
  const { RESERVATION_STATE, customerMessage, business, chatKey, customer } =
    Object.freeze(structuredClone(ctx));

  const status = RESERVATION_STATE?.status;
  const chatHistoryCache = await chatHistoryAdapter.get(chatKey);

  // 1. INTENT SEARCH
  const { points: intentPoints } = await ragService.classifyIntent(
    customerMessage,
    ["global", "bookings", "restaurant"],
  );

  /**
   * @todo notify CMS about unhandled intent
   */
  // Si no se detectó un intent confiable
  if (false) {
    await cmsAdapter.sendQuestionForReview({
      customerMessage,
      inferredIntent: "",
      business: business.id,
      customer: customer?.id,
      context: {
        chatKey,
        historyLength: chatHistoryCache.length,
        timestamp: new Date().toISOString(),
      },
    });
  }

  console.log({ intentPoints: JSON.stringify(intentPoints) });

  // 2. FLOW SELECTION & INITIALIZATION (pre-FSM)
  const isFirstMessage = chatHistoryCache.length === 0;
  if (isFirstMessage) {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: systemMessages.initialGreeting(
          customerMessage,
          customer?.name,
        ),
      },
    ];
    const assistantResponse = await aiAdapter.userMsg(
      { messages },
      conversationalPrompt({
        business,
        intent: intentPoints.at(0)?.payload?.intent,
      }),
    );
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

  // 4. DEFAULT FALLBACK WITH AI AGENT WHEN CUSTOMER ASKS THE WHAT OF SOMETHING
  const messages: ChatMessage[] = [
    ...chatHistoryCache, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
    {
      role: "user",
      content: customerMessage,
    },
  ];
  const assistantResponse = await aiAdapter.userMsg(
    { messages },
    conversationalPrompt({
      business,
      intent: intentPoints.at(0)?.payload?.intent,
    }),
  );
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
