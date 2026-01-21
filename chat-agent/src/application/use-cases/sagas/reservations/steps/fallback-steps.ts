import {
  humanizerAgent,
  intentClassifierAgent,
} from "@/application/agents/restaurant";
import { resolveNextState } from "@/application/patterns";
import { RestaurantCtx } from "@/domain/restaurant";
import { CUSTOMER_INTENT, FlowOptions } from "@/domain/restaurant/reservations";
import {
  buildInfo,
  buildHowToProceed,
  systemMessages,
} from "@/domain/restaurant/reservations/prompts";
import { cacheAdapter, chatHistoryAdapter } from "@/infraestructure/adapters";
import { aiClient, ChatMessage } from "@/infraestructure/http/ai";
import { initReservationChangeSteps } from "./initial-steps";
import { ReservationResult } from "../reservation-saga";
import { buildGuidance } from "@/domain/restaurant/reservations/prompts/conversational-prompts";

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

  const status = RESERVATION_STATE?.status;

  // 1. FLOW SELECTION & INITIALIZATION (pre-FSM, no authoritative)
  if (!status) {
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
        buildHowToProceed(business),
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

    if (customerMessage === FlowOptions.MAKE_RESERVATION) {
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
              description: "MAKE_RESERVATION, option selected",
              internal: `customerMessage=${FlowOptions.MAKE_RESERVATION}`,
            },
          },
        },
      };
    }

    if (customerMessage === FlowOptions.UPDATE_RESERVATION) {
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
              description: "UPDATE_RESERVATION, option selected",
              internal: `customerMessage=${FlowOptions.UPDATE_RESERVATION}`,
            },
          },
        },
      };
    }

    if (customerMessage === FlowOptions.CANCEL_RESERVATION) {
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
              description: "CANCEL_RESERVATION, option selected",
              internal: `customerMessage=${FlowOptions.CANCEL_RESERVATION}`,
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
      buildHowToProceed(business),
    );
    const reminderMSG = status
      ? await aiClient.userMsg({ messages }, buildGuidance(status))
      : assistantResponse;

    return {
      bag: {},
      lastStepResult: {
        execute: {
          result: reminderMSG,
          metadata: {
            description: "HOW_SYSTEM_WORKS, option selected",
            internal: `customerMessage=${CUSTOMER_INTENT.HOW}`,
          },
        },
      },
    };
  }

  // 4. DEFAULT FALLBACK WITH AI AGENT WHEN CUSTOMER ASKS THE WHAT OF SOMETHING
  const assistantResponse = await aiClient.userMsg(
    { messages },
    buildInfo(business),
  );
  const reminderMSG = status
    ? await aiClient.userMsg({ messages }, buildGuidance(status))
    : assistantResponse;

  return {
    bag: {},
    lastStepResult: {
      execute: {
        result: reminderMSG,
        metadata: {
          description: "WHAT_IS_THE_SYSTEM, option selected",
          internal: `customerMessage=${CUSTOMER_INTENT.WHAT}`,
        },
      },
    },
  };
}
