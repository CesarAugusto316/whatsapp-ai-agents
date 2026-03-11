import { DomainCtx } from "@/domain/booking";
import { MainOptions } from "@/domain/booking";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { BookingSagaResult } from "./booking/booking-saga";
import { BookingIntentKey } from "@/application/services/pomdp";
import {
  bookingStateManager,
  productOrderStateManager,
} from "@/application/services/state-managers";
import { formatSagaOutput } from "@/application/patterns";
import { initChangeSteps } from "./booking/workflows";
import { ProductOrderState } from "@/domain/orders";

/**
 *
 * @description use when status is undefined
 * @param ctx
 * @returns
 */
export async function initWorkflow(
  ctx: DomainCtx,
  option: BookingIntentKey | string, // replace in the future for CoreIntentKey
): Promise<BookingSagaResult | undefined> {
  const { bookingKey, productOrderKey, customer, business } = ctx;

  if (option === MainOptions.MAKE_BOOKING) {
    // choice 2
    const transition = bookingStateManager.nextState(MainOptions.MAKE_BOOKING, {
      domain: business.general.businessType,
      timeZone: business.general.timezone,
      data: {
        customerName: customer?.name || "",
      },
    });
    await cacheAdapter.save(bookingKey, {
      businessId: business?.id,
      customerId: customer?.id,
      customerName: customer?.name || "",
      status: transition.nextState, // MAKE_STARTED
    });
    return formatSagaOutput(
      transition.message!,
      "MAKE_RESERVATION, option selected",
      `customerMessage=${MainOptions.MAKE_BOOKING}`,
    );
  }

  if (option === MainOptions.UPDATE_BOOKING) {
    const msg = await initChangeSteps({
      business,
      customer,
      flowOption: MainOptions.UPDATE_BOOKING,
      bookingKey,
    });
    return formatSagaOutput(
      msg,
      "UPDATE_RESERVATION, option selected",
      `customerMessage=${MainOptions.UPDATE_BOOKING}`,
    );
  }

  if (option === MainOptions.CANCEL_BOOKING) {
    const msg = await initChangeSteps({
      business,
      customer,
      flowOption: MainOptions.CANCEL_BOOKING,
      bookingKey,
    });
    return formatSagaOutput(
      msg,
      "CANCEL_RESERVATION, option selected",
      `customerMessage=${MainOptions.CANCEL_BOOKING}`,
    );
  }

  if (option === MainOptions.CREATE_ORDER) {
    // choice 2
    const transition = productOrderStateManager.nextTransition(
      MainOptions.CREATE_ORDER,
      {
        domain: business.general.businessType,
        timeZone: business.general.timezone,
        data: {
          customerName: customer?.name || "",
        },
      },
    );

    await cacheAdapter.save<Partial<ProductOrderState>>(productOrderKey, {
      customerId: customer?.id!,
      customerName: customer?.name || "",
      status: transition.nextState, // MAKE_STARTED
    });
    return formatSagaOutput(
      transition.message!,
      "CREATE_ORDER, option selected",
      `customerMessage=${MainOptions.CREATE_ORDER}`,
    );
  }

  // if (option === "booking:check_availability") {
  //   //
  //   console.log({ option });
  // }
}
