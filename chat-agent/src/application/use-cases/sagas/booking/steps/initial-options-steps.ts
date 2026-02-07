import { humanizerAgent } from "@/application/agents/restaurant";
import { resolveNextState } from "@/application/patterns";
import { RestaurantProps } from "@/domain/restaurant";
import { WorkFlowOptions } from "@/domain/restaurant/booking";
import { systemMessages } from "@/domain/restaurant/booking/prompts";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { initChangeSteps } from "./initial-change-steps";
import { ReservationResult } from "../booking-saga";

/**
 *
 * @description use when status is undefined
 * @param props
 * @returns
 */
export async function initialOptionsWorkflow(
  props: RestaurantProps,
): Promise<ReservationResult | undefined> {
  const { customerMessage, reservationKey, customer, business } = Object.freeze(
    structuredClone(props),
  );

  if (customerMessage === WorkFlowOptions.MAKE_BOOKING) {
    // choice 2
    const transition = resolveNextState(WorkFlowOptions.MAKE_BOOKING);
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
            internal: `customerMessage=${WorkFlowOptions.MAKE_BOOKING}`,
          },
        },
      },
    };
  }

  if (customerMessage === WorkFlowOptions.UPDATE_BOOKING) {
    const msg = await initChangeSteps({
      business,
      customer,
      flowOption: WorkFlowOptions.UPDATE_BOOKING,
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
            internal: `customerMessage=${WorkFlowOptions.UPDATE_BOOKING}`,
          },
        },
      },
    };
  }

  if (customerMessage === WorkFlowOptions.CANCEL_BOOKING) {
    const msg = await initChangeSteps({
      business,
      customer,
      flowOption: WorkFlowOptions.CANCEL_BOOKING,
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
            internal: `customerMessage=${WorkFlowOptions.CANCEL_BOOKING}`,
          },
        },
      },
    };
  }
}
