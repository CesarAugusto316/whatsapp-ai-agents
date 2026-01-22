import type { AvailabilityResponse } from "@/infraestructure/http/cms";
import type { Business } from "@/infraestructure/http/cms";
import { ReservationSchema } from "./schemas";
import { formatLocalDateTime, toLocalDateTime } from "@/domain/utilities";

type Args = {
  availability: AvailabilityResponse;
  business: Business;
  data: ReservationSchema;
};

export function renderMsgNotAvailable({ availability, business, data }: Args) {
  const timezone = business.general.timezone;

  const requestedStartLocal = toLocalDateTime(
    availability.requestedStart,
    timezone,
  );
  const requestedEndLocal = toLocalDateTime(
    availability.requestedEnd,
    timezone,
  );

  let mensaje = `Lo sentimos, no hay disponibilidad para ${data.numberOfPeople} ${data.numberOfPeople === 1 ? "persona" : "personas"} en el horario solicitado:\n`;
  mensaje += `• Desde ${formatLocalDateTime(requestedStartLocal, timezone).date} \n`;

  if (availability.requestedEnd !== availability.requestedStart) {
    mensaje += `  hasta ${formatLocalDateTime(requestedEndLocal, timezone).date}\n`;
  }

  mensaje += `\n`;

  if (availability.suggestedTimes && availability.suggestedTimes.length > 0) {
    mensaje += `✨ Te sugerimos estos horarios alternativos:\n`;
    availability.suggestedTimes.slice(0, 4).forEach((time, index) => {
      const timeLocal = toLocalDateTime(time, timezone);
      const date = formatLocalDateTime(timeLocal, timezone);
      mensaje += `${index + 1}. ${date.date} - ${date.time}\n`;
    });

    if (availability.suggestedTimes.length > 4) {
      mensaje += `• ...y ${availability.suggestedTimes.length - 4} opciones más\n`;
    }
  } else {
    mensaje += `✨ Por favor, intenta con otro horario o un grupo más pequeño.\n`;
  }

  return mensaje;
}
