import {
  formatLocalDateTime,
  utcToLocalDateTime,
} from "@/helpers/datetime-converters";
import { Business } from "@/types/business/cms-types";
import { AvailabilityResponse } from "@/types/reservation/chek-availability.types";
import { ReservationSchema } from "@/types/reservation/schemas";

type Args = {
  availability: AvailabilityResponse;
  business: Business;
  data: ReservationSchema;
};

export function renderMsgNotAvailable({ availability, business, data }: Args) {
  const timezone = business.general.timezone;

  const requestedStartLocal = utcToLocalDateTime(
    availability.requestedStart,
    timezone,
  );
  const requestedEndLocal = utcToLocalDateTime(
    availability.requestedEnd,
    timezone,
  );

  let mensaje = `Lo sentimos, no hay disponibilidad para ${data.numberOfPeople} ${data.numberOfPeople === 1 ? "persona" : "personas"} en el horario solicitado:\n`;
  mensaje += `• ${formatLocalDateTime(requestedStartLocal, timezone)}\n`;

  if (availability.requestedEnd !== availability.requestedStart) {
    mensaje += `  hasta ${formatLocalDateTime(requestedEndLocal, timezone)}\n`;
  }

  mensaje += `\n`;

  if (availability.suggestedTimes && availability.suggestedTimes.length > 0) {
    mensaje += `✨ Te sugerimos estos horarios alternativos:\n`;
    availability.suggestedTimes.slice(0, 4).forEach((time, index) => {
      const timeLocal = utcToLocalDateTime(time, timezone);
      mensaje += `${index + 1}. ${formatLocalDateTime(timeLocal, timezone)}\n`;
    });

    if (availability.suggestedTimes.length > 4) {
      mensaje += `• ...y ${availability.suggestedTimes.length - 4} opciones más\n`;
    }
  } else {
    mensaje += `✨ Por favor, intenta con otro horario o un grupo más pequeño.\n`;
  }

  return mensaje;
}
