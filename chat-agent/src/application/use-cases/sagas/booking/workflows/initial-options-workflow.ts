import { humanizerAgent } from "@/application/agents";
import { DomainCtx } from "@/domain/booking";
import { BookingOptions, BookingStatuses } from "@/domain/booking";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { initChangeSteps } from "./initial-change-steps";
import { BookingSagaResult } from "../booking-saga";
import { BookingIntentKey } from "@/application/services/pomdp";
import { bookingStateManager } from "@/application/services/state-managers";

/**
 *
 * @description use when status is undefined
 * @param ctx
 * @returns
 */
export async function initialOptionsWorkflow(
  ctx: DomainCtx,
  option: BookingIntentKey | string, // replace in the future for CoreIntentKey
): Promise<BookingSagaResult | undefined> {
  const { bookingKey, customer, business } = ctx;

  if (option === BookingOptions.MAKE_BOOKING) {
    // choice 2
    const transition = bookingStateManager.nextState(
      BookingOptions.MAKE_BOOKING,
      undefined,
      {
        domain: business.general.businessType,
        timeZone: business.general.timezone,
        userName: customer?.name,
      },
    );
    await cacheAdapter.save(bookingKey, {
      businessId: business?.id,
      customerId: customer?.id,
      customerName: customer?.name || "",
      status: transition.nextState, // MAKE_STARTED
    });
    const humanizedResponse = await humanizerAgent(transition.templateMessage!);
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
        bookingStateManager.nextState(
          BookingStatuses.UPDATE_STARTED,
          undefined,
          {
            domain: business.general.businessType,
            timeZone: business.general.timezone,
            data: state,
            userName: customer?.name,
          },
        ).templateMessage!,
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
        bookingStateManager.nextState(
          BookingStatuses.CANCEL_VALIDATED,
          undefined,
          {
            domain: business.general.businessType,
            timeZone: business.general.timezone,
            data: state,
          },
        ).templateMessage!,
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
