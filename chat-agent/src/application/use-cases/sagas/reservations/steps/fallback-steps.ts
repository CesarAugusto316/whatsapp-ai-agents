import { intentClassifierAgent } from "@/application/agents/restaurant";
import { RestaurantCtx } from "@/domain/restaurant";
import { CUSTOMER_INTENT } from "@/domain/restaurant/reservations";
import {
  buildInfo,
  buildHowToProceed,
} from "@/domain/restaurant/reservations/prompts";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { ReservationResult } from "../reservation-saga";
import { attachProcessReminder } from "@/application/patterns";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 */
export async function conversationalWorkflow(
  ctx: RestaurantCtx,
): Promise<ReservationResult> {
  const { RESERVATION_STATE, customerMessage, business, chatKey } =
    Object.freeze(structuredClone(ctx));

  const status = RESERVATION_STATE?.status;

  const chatHistoryCache = await chatHistoryAdapter.get(chatKey);
  const messages: ChatMessage[] = [
    ...chatHistoryCache, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
    {
      role: "user",
      content: customerMessage,
    },
  ];

  // 2. INTENT HANDLING WHEN CUSTOMER ASKS THE HOW OF SOMETHING
  const customerIntent = await intentClassifierAgent.howOrWhat(customerMessage);

  // 3. AI EXPLANATION OF HOW THE SYSTEM WORKS
  if (customerIntent === CUSTOMER_INTENT.HOW) {
    // choice 4 again
    const assistantResponse = await aiAdapter.userMsg(
      { messages },
      buildHowToProceed(business),
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
            description: "HOW_SYSTEM_WORKS, option selected",
            internal: `intent=${CUSTOMER_INTENT.HOW}`,
          },
        },
      },
    };
  }

  // 4. DEFAULT FALLBACK WITH AI AGENT WHEN CUSTOMER ASKS THE WHAT OF SOMETHING
  const assistantResponse = await aiAdapter.userMsg(
    { messages },
    buildInfo(business),
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
          description: "WHAT_IS_THE_SYSTEM, option selected",
          internal: `intent=${CUSTOMER_INTENT.WHAT}`,
        },
      },
    },
  };
}
