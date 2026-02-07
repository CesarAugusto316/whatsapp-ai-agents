import { RestaurantProps } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { ReservationResult } from "../booking-saga";
import { attachProcessReminder } from "@/application/patterns";
import {
  conversationalPrompt,
  systemMessages,
} from "@/domain/restaurant/booking/prompts";
import { ragService } from "@/application/services/rag";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 */
export async function conversationalWorkflow(
  ctx: RestaurantProps,
): Promise<ReservationResult> {
  const { bookingState, customerMessage, business, chatKey, customer } =
    Object.freeze(structuredClone(ctx));

  const status = bookingState?.status;
  const chatHistoryCache = await chatHistoryAdapter.get(chatKey);

  // 1. INTENT SEARCH
  const { points: intentPoints } = await ragService.classifyIntent(
    customerMessage,
    ["transversal", "booking", "restaurant"],
  );

  /**
   * @todo notify CMS about unhandled intent
   * Si no se detectó un intent confiable
   *
   * @example
   * cmsAdapter.sendQuestionForReview(businessId, payload)
   */
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
