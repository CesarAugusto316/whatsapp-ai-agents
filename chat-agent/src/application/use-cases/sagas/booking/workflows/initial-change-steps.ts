import { BookingOption, BookingOptions, BookingState } from "@/domain/booking";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { Business, cmsAdapter, Customer } from "@/infraestructure/adapters/cms";
import { toLocalDateTime } from "@/domain/utilities";
import { bookingStateManager } from "@/application/services/state-managers";

type Args = {
  customer?: Customer;
  business: Business;
  bookingKey: string;
  flowOption: BookingOption;
};

export const initChangeSteps = async ({
  customer,
  business,
  bookingKey,
  flowOption,
}: Args) => {
  // Validación del flowOption
  if (
    flowOption !== BookingOptions.UPDATE_BOOKING &&
    flowOption !== BookingOptions.CANCEL_BOOKING
  ) {
    throw new Error(`FlowOption no soportado: ${flowOption}`);
  }
  if (!customer) {
    return "Por favor, Crea una reserva para poder continuar";
  }
  const lastRes = await cmsAdapter.getBookingByParams({
    "where[business][equals]": business.id,
    "where[customer][equals]": customer.id,
    "where[status][equals]": "confirmed",
    sort: "-updatedAt", // the last reservation
    limit: 1, // only one reservation
  });

  const reservation = lastRes.docs.at(0);

  if (!reservation) {
    return "Reserva no encontrada. Seguro que ya has creado una reserva?";
  }

  // we need to format UTC to local time
  const timezone = business.general.timezone;
  const start = toLocalDateTime(reservation.startDateTime, timezone);
  const end = toLocalDateTime(reservation?.endDateTime ?? "", timezone);

  const data = {
    id: reservation.id,
    customerName: reservation.customerName || customer?.name || "",
    businessId: business.id,
    customerId: customer.id,
    status: flowOption,
    numberOfPeople: reservation.numberOfPeople || 0,
    datetime: {
      start,
      end,
    },
  };

  const transition = bookingStateManager.nextState(flowOption, {
    domain: business.general.businessType,
    timeZone: business.general.timezone,
    data,
  });

  const previousState = {
    ...data,
    status: transition.nextState, // FlowOption
  } satisfies Partial<BookingState>;

  await cacheAdapter.save(bookingKey, previousState);
  return transition.message;
};
