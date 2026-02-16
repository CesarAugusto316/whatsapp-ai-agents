import { BookingOption, BookingOptions, BookingState } from "@/domain/booking";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { Business, cmsAdapter, Customer } from "@/infraestructure/adapters/cms";
import { humanizerAgent } from "@/application/agents/restaurant";
import { toLocalDateTime } from "@/domain/utilities";
import { BookingSchema } from "@/domain/booking/input-parser/booking-schemas";
import { bookingStateManager } from "@/application/services/state-managers";

type Args = {
  customer?: Customer;
  business: Business;
  bookingKey: string;
  flowOption: BookingOption;
  getMessage: (state: BookingSchema) => string;
};

export const initChangeSteps = async ({
  customer,
  business,
  bookingKey,
  flowOption,
  getMessage,
}: Args) => {
  // Validación del flowOption
  if (
    flowOption !== BookingOptions.UPDATE_BOOKING &&
    flowOption !== BookingOptions.CANCEL_BOOKING
  ) {
    throw new Error(`FlowOption no soportado: ${flowOption}`);
  }
  if (!customer) {
    return humanizerAgent("Por favor, Crea una reserva para poder continuar");
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
    return humanizerAgent(
      "Reserva no encontrada. Seguro que ya has creado una reserva?",
    );
  }
  const timezone = business.general.timezone;
  const transition = bookingStateManager.nextState(flowOption);
  const start = toLocalDateTime(reservation.startDateTime, timezone);
  const end = toLocalDateTime(reservation?.endDateTime ?? "", timezone);
  const previousState = {
    id: reservation.id,
    customerName: reservation.customerName || customer?.name || "",
    datetime: {
      start,
      end,
    },
    numberOfPeople: reservation.numberOfPeople || 0,
    businessId: business.id,
    customerId: customer.id,
    status: transition.nextState, // FlowOption
  } satisfies Partial<BookingState>;

  await cacheAdapter.save(bookingKey, previousState);
  return humanizerAgent(getMessage(previousState));
};
