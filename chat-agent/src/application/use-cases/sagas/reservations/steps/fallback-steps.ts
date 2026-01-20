import {
  humanizerAgent,
  intentClassifierAgent,
} from "@/application/agents/restaurant";
import { resolveNextState } from "@/application/patterns";
import { RestaurantCtx } from "@/domain/restaurant";
import { CUSTOMER_INTENT, FlowOptions } from "@/domain/restaurant/reservations";
import {
  buildInfoReservationsSystemPrompt,
  howSystemWorksPrompt,
  systemMessages,
} from "@/domain/restaurant/reservations/prompts";
import { cacheAdapter, chatHistoryAdapter } from "@/infraestructure/adapters";
import { aiClient, ChatMessage } from "@/infraestructure/http/ai";
import { initReservationChangeSteps } from "./initial-steps";
import { ReservationResult } from "../reservation-saga";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 */
export async function fallbackWorkflow(
  ctx: RestaurantCtx,
): Promise<ReservationResult> {
  const {
    RESERVATION_STATE,
    customerMessage,
    reservationKey,
    customer,
    business,
    chatKey,
  } = Object.freeze(structuredClone(ctx));

  // 1. FLOW SELECTION & INITIALIZATION (pre-FSM, no authoritative)
  if (!RESERVATION_STATE?.status) {
    //
    const chatHistoryCache = await chatHistoryAdapter.get(chatKey);
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
      const assistantResponse = await aiClient.userMsg(
        { messages },
        howSystemWorksPrompt(business),
      );
      return {
        bag: {},
        lastStepResult: {
          execute: {
            result: assistantResponse,
            metadata: {
              value: "FIRST_MESSAGE",
            },
          },
        },
      };
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
      const humanizedResponse = await humanizerAgent(responseMsg);
      return {
        bag: {},
        lastStepResult: {
          execute: {
            result: humanizedResponse,
            metadata: {
              value: FlowOptions.MAKE_RESERVATION,
            },
          },
        },
      };
    }

    if (customerMessage == FlowOptions.UPDATE_RESERVATION) {
      const timezone = business.general.timezone;
      const msg = await initReservationChangeSteps({
        business,
        customer,
        flowOption: FlowOptions.UPDATE_RESERVATION,
        getMessage: (state) => systemMessages.getUpdateMsg(state, timezone),
        reservationKey,
      });

      return {
        bag: {},
        lastStepResult: {
          execute: {
            result: msg,
            metadata: {
              value: FlowOptions.UPDATE_RESERVATION,
            },
          },
        },
      };
    }

    if (customerMessage == FlowOptions.CANCEL_RESERVATION) {
      const timezone = business.general.timezone;
      const msg = await initReservationChangeSteps({
        business,
        customer,
        flowOption: FlowOptions.CANCEL_RESERVATION,
        getMessage: (state) => systemMessages.getCancelMsg(state, timezone),
        reservationKey,
      });
      return {
        bag: {},
        lastStepResult: {
          execute: {
            result: msg,
            metadata: {
              value: FlowOptions.CANCEL_RESERVATION,
            },
          },
        },
      };
    }
  }

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
    const assistantResponse = await aiClient.userMsg(
      { messages },
      howSystemWorksPrompt(business, RESERVATION_STATE?.status),
    );
    return {
      bag: {},
      lastStepResult: {
        execute: {
          result: assistantResponse,
          metadata: {
            value: CUSTOMER_INTENT.HOW,
          },
        },
      },
    };
  }

  // 4. DEFAULT FALLBACK WITH AI AGENT WHEN CUSTOMER ASKS THE WHAT OF SOMETHING
  const assistantResponse = await aiClient.userMsg(
    { messages },
    buildInfoReservationsSystemPrompt(business, RESERVATION_STATE?.status),
  );
  return {
    bag: {},
    lastStepResult: {
      execute: {
        result: assistantResponse,
        metadata: {
          value: CUSTOMER_INTENT.WHAT,
        },
      },
    },
  };
}
