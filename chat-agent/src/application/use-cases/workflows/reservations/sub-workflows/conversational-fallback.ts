import { resolveNextState } from "@/application/patterns/FSM-workflow/resolve-next-state";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import {
  buildInfoReservationsSystemPrompt,
  howSystemWorksPrompt,
} from "@/domain/restaurant/reservations/prompts/conversational-prompts";
import { systemMessages } from "@/domain/restaurant/reservations/prompts/system-messages";
import {
  CUSTOMER_INTENT,
  FlowOptions,
} from "@/domain/restaurant/reservations/reservation.types";
import cacheAdapter from "@/infraestructure/adapters/cache.adapter";
import chatHistoryAdapter from "@/infraestructure/adapters/chatHistory.adapter";
import { aiClient } from "@/infraestructure/http/ai/ai.client";
import { ModelMessage } from "@/infraestructure/http/ai/llm.types";
import { logger } from "@/infraestructure/logging/logger";
import { initReservationChangeSteps } from "../steps/init-reservation-update.steps";
import { intentClassifierAgent } from "@/application/agents/restaurant/reservation/intent-classifier-agent";
import { humanizerAgent } from "@/application/agents/restaurant/reservation/humanizer-agent";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 */
export async function fallbackWorkflow(ctx: RestaurantCtx): Promise<string> {
  const {
    RESERVATION_STATE,
    customerMessage = "",
    reservationKey = "",
    customer,
    business,
    chatKey = "",
  } = Object.freeze(structuredClone(ctx));

  // 1. FLOW SELECTION & INITIALIZATION (pre-FSM, no authoritative)
  if (!RESERVATION_STATE) {
    //
    const chatHistoryCache = await chatHistoryAdapter.get(chatKey);
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
      const assistantResponse = aiClient.userMsg(
        messages,
        howSystemWorksPrompt(business),
      );
      logger.info("AI Fallback executed", {
        isFirstMessage,
        customerMessage,
      });
      return assistantResponse;
    }

    if (customerMessage == FlowOptions.MAKE_RESERVATION) {
      // choice 2
      const transition = resolveNextState(FlowOptions.MAKE_RESERVATION);
      await cacheAdapter.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name || "",
        status: transition.nextState, // MAKE_STARTED
      });
      const responseMsg = systemMessages.getCreateMsg({
        userName: customer?.name,
      });
      logger.info("AI Fallback executed", {
        FlowOption: FlowOptions.MAKE_RESERVATION,
      });
      return humanizerAgent(responseMsg);
    }

    if (customerMessage == FlowOptions.UPDATE_RESERVATION) {
      const timezone = business.general.timezone;
      logger.info("AI Fallback executed", {
        FlowOption: FlowOptions.UPDATE_RESERVATION,
      });
      return initReservationChangeSteps({
        business,
        customer,
        flowOption: FlowOptions.UPDATE_RESERVATION,
        getMessage: (state) => systemMessages.getUpdateMsg(state, timezone),
        reservationKey,
      });
    }

    if (customerMessage == FlowOptions.CANCEL_RESERVATION) {
      const timezone = business.general.timezone;
      logger.info("AI Fallback executed", {
        FlowOption: FlowOptions.CANCEL_RESERVATION,
      });
      return initReservationChangeSteps({
        business,
        customer,
        flowOption: FlowOptions.CANCEL_RESERVATION,
        getMessage: (state) => systemMessages.getCancelMsg(state, timezone),
        reservationKey,
      });
    }
  }

  const chatHistoryCache = await chatHistoryAdapter.get(chatKey);
  const messages: ModelMessage[] = [
    ...chatHistoryCache, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
    {
      role: "user",
      content: customerMessage,
    },
  ];

  // 2. INTENT HANDLING WHEN CUSTOMER ASKS THE HOW OF SOMETHING
  const customerIntent =
    await intentClassifierAgent.customerIntentClassifier(customerMessage);
  logger.info("AI Fallback executed", {
    customerIntent,
    customerMessage,
  });

  // 3. AI EXPLANATION OF HOW THE SYSTEM WORKS
  if (customerIntent === CUSTOMER_INTENT.HOW) {
    // choice 4 again
    const assistantResponse = aiClient.userMsg(
      messages,
      howSystemWorksPrompt(business, RESERVATION_STATE?.status),
    );
    return assistantResponse;
  }

  // 4. DEFAULT FALLBACK WITH AI AGENT WHEN CUSTOMER ASKS THE WHAT OF SOMETHING
  const assistantResponse = aiClient.userMsg(
    messages,
    buildInfoReservationsSystemPrompt(business, RESERVATION_STATE?.status),
  );
  return assistantResponse;
}
