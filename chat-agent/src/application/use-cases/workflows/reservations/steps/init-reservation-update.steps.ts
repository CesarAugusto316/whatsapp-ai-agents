import { humanizerAgent } from "@/application/agents/restaurant/reservation/humanizer-agent";
import { resolveNextState } from "@/application/patterns/FSM-workflow/resolve-next-state";
import {
  FlowOption,
  FlowOptions,
  ReservationState,
} from "@/domain/restaurant/reservations/reservation.types";
import { ReservationSchema } from "@/domain/restaurant/reservations/schemas";
import { utcToLocalDateTime } from "@/domain/utilities/datetime-formatting/datetime-converters";
import cacheAdapter from "@/infraestructure/adapters/cache.adapter";
import {
  Appointment,
  Business,
  Customer,
} from "@/infraestructure/http/cms/cms-types";
import cmsClient from "@/infraestructure/http/cms/cms.client";

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

  if (lastRes.status !== 200) {
    return humanizerAgent(
      "Ocurrió un error al buscar la reserva, intenta de nuevo",
    );
  }
  const reservation = (
    (await lastRes.json()) as { docs: Appointment[] }
  ).docs.at(0);

  if (!reservation) {
    return humanizerAgent(
      "Reserva no encontrada. Seguro que ya has creado una reserva?",
    );
  }
  const timezone = business.general.timezone;
  const transition = resolveNextState(flowOption);
  const start = utcToLocalDateTime(reservation.startDateTime, timezone);
  const end = utcToLocalDateTime(reservation?.endDateTime ?? "", timezone);
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
