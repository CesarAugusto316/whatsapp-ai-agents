import { humanizerAgent } from "@/application/agents/restaurant";
import { resolveNextState } from "@/application/patterns";
import { RestaurantCtx } from "@/domain/restaurant";
import { BookingOptions } from "@/domain/restaurant/booking";
import { systemMessages } from "@/domain/restaurant/booking/prompts";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { initChangeSteps } from "./initial-change-steps";
import { BookingResult } from "../booking-saga";
import { BookingIntentKey } from "@/application/services/pomdp";

/**
 *
 * @description use when status is undefined
 * @param ctx
 * @returns
 */
export async function initialOptionsWorkflow(
  ctx: RestaurantCtx,
  option: BookingIntentKey | string, // replace in the future for CoreIntentKey
): Promise<BookingResult | undefined> {
  const { bookingKey, customer, business } = ctx;

  if (option === BookingOptions.MAKE_BOOKING) {
    // choice 2
    const transition = resolveNextState(BookingOptions.MAKE_BOOKING);
    await cacheAdapter.save(bookingKey, {
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
            internal: `customerMessage=${BookingOptions.MAKE_BOOKING}`,
          },
        },
      },
    };
  }

  if (option === BookingOptions.UPDATE_BOOKING) {
    const msg = await initChangeSteps({
      business,
      customer,
      flowOption: BookingOptions.UPDATE_BOOKING,
      getMessage: (state) =>
        systemMessages.getUpdateMsg(state, business.general.timezone),
      bookingKey,
    });
    return {
      bag: {},
      lastStepResult: {
        execute: {
          result: msg,
          metadata: {
            description: "UPDATE_RESERVATION, option selected",
            internal: `customerMessage=${BookingOptions.UPDATE_BOOKING}`,
          },
        },
      },
    };
  }

  if (option === BookingOptions.CANCEL_BOOKING) {
    const msg = await initChangeSteps({
      business,
      customer,
      flowOption: BookingOptions.CANCEL_BOOKING,
      getMessage: (state) =>
        systemMessages.getCancelMsg(state, business.general.timezone),
      bookingKey,
    });
    return {
      bag: {},
      lastStepResult: {
        execute: {
          result: msg,
          metadata: {
            description: "CANCEL_RESERVATION, option selected",
            internal: `customerMessage=${BookingOptions.CANCEL_BOOKING}`,
          },
        },
      },
    };
  }

  if (option === "booking:check_availability") {
    //
    console.log({ option });
  }
}
