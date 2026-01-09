import {
  aiClient,
  customerIntentClassifier,
  humanizerAgent,
} from "@/llm/llm.config";
import {
  buildInfoReservationsSystemPrompt,
  howSystemWorksPrompt,
} from "@/llm/prompts/conversational-prompts";
import { systemMessages } from "@/llm/prompts/system-messages";
import chatHistoryService from "@/services/chatHistory.service";
import reservationCacheService from "@/services/reservationCache.service";
import { AppContext, ModelMessage } from "@/types/hono.types";
import {
  CUSTOMER_INTENT,
  FlowOptions,
} from "@/types/reservation/reservation.types";
import { resolveNextState } from "@/workflow-fsm/resolve-next-state";
import { initReservationChange } from "./tasks/init-reservation-update.task";
import { logger } from "@/middlewares/logger-middleware";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 */
export async function resolveConversationalFallback(
  ctx: AppContext,
): Promise<string> {
  const {
    RESERVATION_CACHE,
    customerMessage = "",
    reservationKey = "",
    customer,
    business,
    chatKey = "",
  } = Object.freeze(structuredClone(ctx));

  // 1. FLOW SELECTION & INITIALIZATION (pre-FSM, no authoritative)
  if (!RESERVATION_CACHE) {
    //
    const chatHistoryCache = await chatHistoryService.get(chatKey);
    const isFirstMessage = chatHistoryCache.length === 0;
    if (isFirstMessage) {
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: systemMessages.initialGreeting(
            customerMessage,
            customer?.name,
          ),
        },
      ];
      const assistantResponse = aiClient(
        messages,
        howSystemWorksPrompt(business),
      );
      return assistantResponse;
    }

    if (customerMessage == FlowOptions.MAKE_RESERVATION) {
      // choice 2
      const transition = resolveNextState(FlowOptions.MAKE_RESERVATION);
      await reservationCacheService.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name || "",
        status: transition.nextState, // MAKE_STARTED
      });
      const responseMsg = systemMessages.getCreateMsg({
        userName: customer?.name,
      });
      return humanizerAgent(responseMsg);
    }

    if (customerMessage == FlowOptions.UPDATE_RESERVATION) {
      const timezone = business.general.timezone;
      return initReservationChange({
        business,
        customer,
        flowOption: FlowOptions.UPDATE_RESERVATION,
        getMessage: (state) => systemMessages.getUpdateMsg(state, timezone),
        reservationKey,
      });
    }

    if (customerMessage == FlowOptions.CANCEL_RESERVATION) {
      const timezone = business.general.timezone;
      return initReservationChange({
        business,
        customer,
        flowOption: FlowOptions.CANCEL_RESERVATION,
        getMessage: (state) => systemMessages.getCancelMsg(state, timezone),
        reservationKey,
      });
    }
  }

  const chatHistoryCache = await chatHistoryService.get(chatKey);
  const messages: ModelMessage[] = [
    ...chatHistoryCache, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
    {
      role: "user",
      content: customerMessage,
    },
  ];

  // 2. INTENT HANDLING WHEN CUSTOMER ASKS THE HOW OF SOMETHING
  const customerIntent = await customerIntentClassifier(customerMessage);
  logger.info("AI Fallback executed", {
    customerIntent,
  });

  // 3. AI EXPLANATION OF HOW THE SYSTEM WORKS
  if (customerIntent === CUSTOMER_INTENT.HOW) {
    // choice 4 again
    const assistantResponse = aiClient(
      messages,
      howSystemWorksPrompt(business, RESERVATION_CACHE?.status),
    );
    return assistantResponse;
  }

  // 4. DEFAULT FALLBACK WITH AI AGENT WHEN CUSTOMER ASKS THE WHAT OF SOMETHING
  const assistantResponse = aiClient(
    messages,
    buildInfoReservationsSystemPrompt(business, RESERVATION_CACHE?.status),
  );
  return assistantResponse;
}
