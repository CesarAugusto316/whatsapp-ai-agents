import { checkUtcDateInRange, toLocalDateTime } from "@/domain/utilities";
import { Business } from "@/infraestructure/adapters/cms";

// Formatear para mostrar
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/**
 *
 * @param business
 * @param reservationDateUTC in UTC format
 * @returns
 */
export function isWithinHolydayRange(
  business: Business,
  reservationDateUTC: string,
) {
  const timezone = business?.general?.timezone ?? "UTC";
  const holidaysInUTC = business?.general?.nextHoliday ?? [];

  // check utc dates
  const isWithinHoliday = holidaysInUTC.find(({ startDate, endDate }) =>
    checkUtcDateInRange({ startDate, endDate }, reservationDateUTC),
  );

  if (isWithinHoliday) {
    // Convertir fechas UTC a formato local
    const holiday = {
      startLocal: formatDate(
        toLocalDateTime(isWithinHoliday.startDate, timezone).date,
      ),
      endLocal: formatDate(
        toLocalDateTime(isWithinHoliday.endDate, timezone).date,
      ),
    };

    // Mensaje mejorado
    return {
      isWithinRange: true,
      message: `
       🏖️ **Período de Vacaciones**

       La fecha seleccionada coincide con nuestro período de vacaciones programadas:

       *${holiday.startLocal} al ${holiday.endLocal}*

       Para continuar con la reserva, por favor selecciona una fecha fuera de este rango.

       ¡Agradecemos tu comprensión! 😊
     `,
    };
  }

  return {
    isWithinRange: false,
  };
}
