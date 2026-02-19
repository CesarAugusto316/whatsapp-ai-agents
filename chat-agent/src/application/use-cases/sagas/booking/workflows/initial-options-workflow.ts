import { DomainCtx } from "@/domain/booking";
import { BookingOptions } from "@/domain/booking";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { initChangeSteps } from "./initial-change-steps";
import { BookingSagaResult } from "../booking-saga";
import { BookingIntentKey } from "@/application/services/pomdp";
import { bookingStateManager } from "@/application/services/state-managers";
import { formatSagaOutput } from "@/application/patterns";

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
      {
        domain: business.general.businessType,
        timeZone: business.general.timezone,
        data: {
          customerName: customer?.name || "",
        },
      },
    );
    await cacheAdapter.save(bookingKey, {
      businessId: business?.id,
      customerId: customer?.id,
      customerName: customer?.name || "",
      status: transition.nextState, // MAKE_STARTED
    });
    return formatSagaOutput(
      transition.message!,
      "MAKE_RESERVATION, option selected",
      `customerMessage=${BookingOptions.MAKE_BOOKING}`,
    );
  }

  if (option === BookingOptions.UPDATE_BOOKING) {
    const msg = await initChangeSteps({
      business,
      customer,
      flowOption: BookingOptions.UPDATE_BOOKING,
      bookingKey,
    });
    return formatSagaOutput(
      msg,
      "UPDATE_RESERVATION, option selected",
      `customerMessage=${BookingOptions.UPDATE_BOOKING}`,
    );
  }

  if (option === BookingOptions.CANCEL_BOOKING) {
    const msg = await initChangeSteps({
      business,
      customer,
      flowOption: BookingOptions.CANCEL_BOOKING,
      bookingKey,
    });
    return formatSagaOutput(
      msg,
      "CANCEL_RESERVATION, option selected",
      `customerMessage=${BookingOptions.CANCEL_BOOKING}`,
    );
  }

  if (option === "booking:check_availability") {
    //
    console.log({ option });
  }
}
