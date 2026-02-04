import {
  FlowOption,
  FlowOptions,
  ReservationState,
} from "@/domain/restaurant/reservations";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { Business, cmsClient, Customer } from "@/infraestructure/http/cms";
import { resolveNextState } from "@/application/patterns";
import { humanizerAgent } from "@/application/agents/restaurant";
import { ReservationSchema } from "@/domain/restaurant/reservations/schemas";
import { toLocalDateTime } from "@/domain/utilities";

type Args = {
  customer?: Customer;
  business: Business;
  reservationKey: string;
  flowOption: FlowOption;
  getMessage: (state: ReservationSchema) => string;
};

export const initReservationChangeSteps = async ({
  customer,
  business,
  reservationKey,
  flowOption,
  getMessage,
}: Args) => {
  // Validación del flowOption
  if (
    flowOption !== FlowOptions.UPDATE_RESERVATION &&
    flowOption !== FlowOptions.CANCEL_RESERVATION
  ) {
    throw new Error(`FlowOption no soportado: ${flowOption}`);
  }
  if (!customer) {
    return humanizerAgent("Por favor, Crea una reserva para poder continuar");
  }
  const lastRes = await cmsClient.getAppointmentsByParams({
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
  const transition = resolveNextState(flowOption);
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
  } satisfies Partial<ReservationState>;

  await cacheAdapter.save(reservationKey, previousState);
  return humanizerAgent(getMessage(previousState));
};
