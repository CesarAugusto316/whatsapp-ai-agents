import { humanizerAgent } from "@/application/agents/restaurant";
import { resolveNextState } from "@/application/patterns";
import { RestaurantCtx } from "@/domain/restaurant";
import { FlowOptions } from "@/domain/restaurant/reservations";
import { systemMessages } from "@/domain/restaurant/reservations/prompts";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
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
  const { customerMessage, reservationKey, customer, business } = Object.freeze(
    structuredClone(ctx),
  );

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
    const msg = await initReservationChangeSteps({
      business,
      customer,
      flowOption: FlowOptions.UPDATE_RESERVATION,
      getMessage: (state) =>
        systemMessages.getUpdateMsg(state, business.general.timezone),
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
    const msg = await initReservationChangeSteps({
      business,
      customer,
      flowOption: FlowOptions.CANCEL_RESERVATION,
      getMessage: (state) =>
        systemMessages.getCancelMsg(state, business.general.timezone),
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
