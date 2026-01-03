import { utcToLocalDateTime } from "@/helpers/datetime-converters";
import { humanizerAgent } from "@/llm/llm.config";
import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import { Appointment, Business, Customer } from "@/types/business/cms-types";
import {
  FlowOption,
  FlowOptions,
  ReservationState,
} from "@/types/reservation/reservation.types";
import { ReservationSchema } from "@/types/reservation/schemas";
import { resolveNextState } from "@/workflow-fsm/resolve-next-state";

type Args = {
  customer?: Customer;
  business: Business;
  reservationKey: string;
  flowOption: FlowOption;
  getMessage: (state: ReservationSchema) => string;
};

export const initReservationChange = async ({
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
  const lastRes = await businessService.getAppointmentsByParams({
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
  console.log({ reservation });
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

  console.log({ previousState });
  await reservationCacheService.save(reservationKey, previousState);
  return humanizerAgent(getMessage(previousState));
};
