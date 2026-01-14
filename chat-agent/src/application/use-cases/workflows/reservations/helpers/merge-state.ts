import { ReservationSchema } from "@/domain/restaurant/reservations/schemas";

export function mergeReservationData(
  incoming: Partial<ReservationSchema>,
  previous?: Partial<ReservationSchema>,
): ReservationSchema {
  return {
    customerName:
      incoming.customerName?.trim() || previous?.customerName?.trim() || "",
    datetime: {
      start: {
        date:
          incoming.datetime?.start?.date ||
          previous?.datetime?.start?.date ||
          "",
        time:
          incoming.datetime?.start?.time ||
          previous?.datetime?.start?.time ||
          "",
      },
      end: {
        date:
          incoming.datetime?.end?.date || previous?.datetime?.end?.date || "",
        time:
          incoming.datetime?.end?.time || previous?.datetime?.end?.time || "",
      },
    },
    numberOfPeople: incoming.numberOfPeople || previous?.numberOfPeople || 0,
  };
}
