import { mergeReservationData } from "@/helpers/merge-state";
import {
  humanizerAgent,
  inputIntentClassifier,
  validatorAgent,
} from "@/llm/llm.config";
import { ReservationMode, systemMessages } from "@/llm/prompts/system-messages";
import reservationCacheService from "@/services/reservationCache.service";
import { Business, Customer } from "@/types/business/cms-types";
import {
  CustomerActions,
  FlowOptions,
  FMStatus,
  InputIntent,
  ReservationState,
} from "@/types/reservation/reservation.types";
import { resolveNextState } from "@/workflow-fsm/resolve-next-state";
import businessService from "@/services/business.service";
import {
  formatHour,
  formatLocalDateTime,
  localDateTimeToUTC,
  utcToLocalDateTime,
} from "@/helpers/datetime-converters";
import { isWithinBusinessHours } from "@/helpers/isDateWithinSchedule";
import { isWithinHolydayRange } from "./check-next-holyday";

type Args = {
  reservation: Partial<ReservationState>;
  customer?: Customer;
  business: Business;
  reservationKey: string;
  fmStatus: FMStatus;
  customerMessage: string;
  mode: ReservationMode;
};

export const ATTEMPTS = 4;

/**
 *
 * @description
 * @returns
 */
export async function collecDataTask({
  reservation,
  customer,
  business,
  reservationKey,
  fmStatus,
  customerMessage,
  mode,
}: Args) {
  //
  const previousState = mergeReservationData(reservation, {
    customerName: customer?.name || "",
  });

  try {
    // OPTION: 1. SALIR
    if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
      await reservationCacheService.delete(reservationKey);
      const responseMsg = systemMessages.getExitMsg();
      return humanizerAgent(responseMsg);
    }
    if ((reservation?.attempts ?? 0) >= ATTEMPTS) {
      await reservationCacheService.delete(reservationKey);
      return humanizerAgent(`
        Has llegado al límite de intentos fallidos al checkear disponibilidad.
        Empecemos de nuevo desde cero. Escribe "${FlowOptions.UPDATE_RESERVATION}"
        para iniciar otro proceso de reserva.
      `);
    }
    const inputIntent = await inputIntentClassifier(customerMessage);

    if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
      return InputIntent.CUSTOMER_QUESTION;
      // This breaks the flow and the fallback AGENT takes control
      // (Just for this time)
    }

    // ✅ All fields are required here
    const result = await validatorAgent.parse(
      business,
      customerMessage,
      previousState,
    );
    if (!result) {
      return humanizerAgent(
        "Lo siento no pude comprender tus datos, podrias escribirlos de nuevo con mas claridad ?",
      );
    }
    const { parsedData, mergedData } = result;
    const { success, data, error } = parsedData;

    if (!success) {
      await reservationCacheService.save(reservationKey, {
        ...reservation,
        ...mergedData,
      } satisfies Partial<ReservationState>);

      const aiDataCollector = validatorAgent.humanizeErrors(business, error);
      return aiDataCollector;
    }

    const timezone = business.general.timezone;
    const { start, end } = data.datetime;
    const isWithinSchedule = {
      start: isWithinBusinessHours(business.schedule, timezone, start),
      end: isWithinBusinessHours(business.schedule, timezone, end),
    };

    console.log({
      data,
      isWithinSchedule,
      timezone,
    });

    if (!isWithinSchedule.start || !isWithinSchedule.end) {
      /** @todo proponer otras fechas de reservación */
      return `
          😔 Lo sentimos, el día y hora seleccionados no están dentro del horario
          de atención del negocio. Por favor, selecciona otro día y hora.
        `;
    }
    const startDateTime = localDateTimeToUTC(start, timezone);
    const endDateTime = localDateTimeToUTC(end, timezone);

    const { isWithinRange, message } = isWithinHolydayRange(
      business,
      startDateTime,
    );

    if (isWithinRange) {
      return message;
    }

    /**
     *
     * @todo debemos que validar si la nueva fecha o
     * rango de tiempo (startTime - endTime) esta libre exluyendo
     * la fecha que ya tenemos seleccionada, hay que evaluar algunas condiciones
     * antes de asignar un nuevo timeSlot
     */
    // const isAvailable = await businessService.findAppointmentByParams({
    //   "where[numberOfPeople][equals]": data.numberOfPeople,
    //   "where[startDateTime][equals]": startDateTime,
    //   "where[endDateTime][equals]": endDateTime,
    // });
    // if (!isAvailable) {
    //   const retries = (reservation?.attempts || 0) + 1;
    //   await reservationCacheService.save(reservationKey, {
    //     ...reservation,
    //     ...data,
    //     attempts: retries,
    //   } satisfies Partial<ReservationState>);

    //   return humanizerAgent(
    //     `
    //         Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.
    //         Tienes ${ATTEMPTS - retries} intentos restantes.
    //       `,
    //   );
    // }

    const availability = await businessService.checkAvailability({
      "where[business][equals]": reservation.businessId,
      "where[startDateTime][equals]": startDateTime,
      "where[endDateTime][equals]": endDateTime,
      "where[numberOfPeople][equals]": data.numberOfPeople,
    });

    if (!availability?.isFullyAvailable) {
      const retries = (reservation?.attempts || 0) + 1;
      await reservationCacheService.save(reservationKey, {
        ...reservation,
        ...data,
        attempts: retries,
      } satisfies Partial<ReservationState>);

      let mensaje = `Lo sentimos, no hay disponibilidad para ${data.numberOfPeople} personas en el horario solicitado:\n`;
      mensaje += `• ${formatLocalDateTime(start, timezone)} - ${formatLocalDateTime(end, timezone)}\n\n`;

      // Analizar disponibilidad por hora
      if (availability?.availableSlotsPerHour) {
        const horasDisponibles = availability.availableSlotsPerHour
          .filter((slot) => slot.isAvailable)
          .map((slot) => ({
            hora: formatHour(new Date(slot.hour), timezone),
            capacidad: slot.availableSlots,
          }));

        if (horasDisponibles.length > 0) {
          mensaje += `Sin embargo, tenemos disponibilidad en estos horarios:\n`;
          horasDisponibles.forEach((slot) => {
            mensaje += `• ${slot.hora}: ${slot.capacidad} espacios disponibles\n`;
          });
          mensaje += `\nPuedes ajustar tu reserva a uno de estos horarios.\n`;
        } else {
          const capacidadPorHora = availability.totalCapacityPerHour;
          const horariosConCapacidad = availability.availableSlotsPerHour
            .filter((slot) => slot.availableSlots > 0)
            .map((slot) => ({
              hora: formatHour(new Date(slot.hour), timezone),
              espacios: slot.availableSlots,
            }));

          if (horariosConCapacidad.length > 0) {
            mensaje += `La capacidad máxima por hora es de ${capacidadPorHora} personas.\n`;
            mensaje += `Para tu grupo de ${data.numberOfPeople} personas, necesitaríamos:\n`;

            horariosConCapacidad.forEach((slot) => {
              const necesita = data.numberOfPeople - slot.espacios;
              mensaje += `• ${slot.hora}: Disponibles ${slot.espacios} espacios (faltan ${necesita})\n`;
            });

            mensaje += `\nPuedes intentar con un grupo más pequeño o en otro horario.\n`;
          }
        }
      }

      // Sugerir horarios alternativos si están disponibles
      if (
        availability?.suggestedTimes &&
        availability.suggestedTimes.length > 0
      ) {
        mensaje += `\nTe sugerimos estos horarios alternativos:\n`;
        availability.suggestedTimes.slice(0, 3).forEach((time, index) => {
          mensaje += `${index + 1}. ${formatLocalDateTime(utcToLocalDateTime(time, timezone), timezone)}\n`;
        });
      }
      return humanizerAgent(mensaje);
    }

    // 2. ✅ INPUT DATA VALIDATED
    const transition = resolveNextState(fmStatus);
    await reservationCacheService.save(reservationKey, {
      ...reservation,
      ...data,
      status: transition.nextState, // UPDATE_VALIDATED,
    } satisfies Partial<ReservationState>);

    const responseMsg = systemMessages.getConfirmationMsg(data, mode);
    return humanizerAgent(responseMsg);
  } catch {
    return humanizerAgent(
      "Ocurrió un problema inesperado. ¿Podemos intentar de nuevo con los datos de la reserva?",
    );
  }
}
