import { humanizerAgent } from "@/application/agents/restaurant";
import { resolveNextState } from "@/application/patterns";
import { RestaurantCtx } from "@/domain/restaurant";
import { FlowOptions } from "@/domain/restaurant/reservations";
import {
  buildHowToProceed,
  systemMessages,
} from "@/domain/restaurant/reservations/prompts";
import { cacheAdapter, chatHistoryAdapter } from "@/infraestructure/adapters";
import { aiClient, ChatMessage } from "@/infraestructure/http/ai";
import { initReservationChangeSteps } from "./initial-change-steps";
import { ReservationResult } from "../reservation-saga";

/**
 *
 * @description use when status is undefined
 * @param ctx
 * @returns
 */
export async function initialOptionsWorkflow(
  ctx: RestaurantCtx,
): Promise<ReservationResult | undefined> {
  const { customerMessage, reservationKey, customer, business, chatKey } =
    Object.freeze(structuredClone(ctx));

  // 1. FLOW SELECTION & INITIALIZATION (pre-FSM, no authoritative)
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
