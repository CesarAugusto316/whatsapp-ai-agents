import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import {
  CustomerActions,
  ReservationState,
  ReservationStatuses,
  InputIntent,
  FlowOptions,
  FMStatus,
} from "@/types/reservation/reservation.types";
import { Appointment } from "@/types/business/cms-types";
import {
  humanizerAgent,
  inputIntentClassifier,
  validatorAgent,
} from "@/llm/llm.config";
import { ATTEMPTS } from "./make.workflow";
import { AppContext } from "@/types/hono.types";
import { resolveNextState } from "@/workflow-fsm/resolve-next-state";
import { StateWorkflowHandler } from "@/workflow-fsm/state-workflow.types";
import { systemMessages } from "@/llm/prompts/system-messages";
import { mergeReservationData } from "@/helpers/merge-state";
import { isWithinBusinessHours } from "@/helpers/isDateWithinSchedule";
import { localDateTimeToUTC } from "@/helpers/datetime-converters";

const started: StateWorkflowHandler<AppContext, FMStatus> = async (
  ctx,
  currStatus,
) => {
  const {
    RESERVATION_CACHE,
    customerMessage,
    reservationKey,
    customer,
    business,
  } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  if (!RESERVATION_CACHE) return;

  const previousState = mergeReservationData(RESERVATION_CACHE, {
    customerName: customer?.name,
  });

  try {
    // OPTION: 1. SALIR
    if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
      await reservationCacheService.delete(reservationKey);
      const responseMsg = systemMessages.getExitMsg();
      return humanizerAgent(responseMsg);
    }
    if ((RESERVATION_CACHE?.attempts ?? 0) >= ATTEMPTS) {
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

    if (RESERVATION_CACHE?.id) {
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
          ...RESERVATION_CACHE,
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
        schedule: JSON.stringify(business.schedule),
        timezone,
      });

      if (!isWithinSchedule.start || !isWithinSchedule.end) {
        /** @todo proponer otras fechas de reservación */
        return `
          😔 Lo sentimos, la fecha y hora seleccionada no está dentro del horario
          de atención del negocio. Por favor, selecciona otra fecha y hora.
        `;
      }
      const startDateTime = localDateTimeToUTC(start, timezone);
      const endDateTime = localDateTimeToUTC(end, timezone);

      /**
       *
       * @todo debemos que validar si la nueva fecha o
       * rango de tiempo (startTime - endTime) esta libre exluyendo
       * la fecha que ya tenemos seleccionada, hay que evaluar algunas condiciones
       * antes de asignar un nuevo timeSlot
       */
      const isAvailable = await businessService.checkAvailability({
        "where[numberOfPeople][equals]": data.numberOfPeople,
        "where[startDateTime][equals]": startDateTime,
        "where[endDateTime][equals]": endDateTime,
      });
      if (!isAvailable) {
        const retries = (RESERVATION_CACHE?.attempts || 0) + 1;
        await reservationCacheService.save(reservationKey, {
          ...RESERVATION_CACHE,
          ...data,
          attempts: retries,
        } satisfies Partial<ReservationState>);

        return humanizerAgent(
          `
            Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.
            Tienes ${ATTEMPTS - retries} intentos restantes.
          `,
        );
      }

      // 2. ✅ INPUT DATA VALIDATED
      const transition = resolveNextState(currStatus);
      await reservationCacheService.save(reservationKey, {
        ...RESERVATION_CACHE,
        ...data,
        status: transition.nextState, // UPDATE_VALIDATED,
      } satisfies Partial<ReservationState>);

      const responseMsg = systemMessages.getConfirmationMsg(data, "update");
      return humanizerAgent(responseMsg);
    }
  } catch (error) {
    //
    // BORRAR CACHE y REINICIAR
    return humanizerAgent(
      "Ocurrió un problema inesperado. ¿Podemos intentar de nuevo con los datos de la reserva?",
    );
  }
};

const validated: StateWorkflowHandler<AppContext, FMStatus> = async (ctx) => {
  const {
    RESERVATION_CACHE,
    customerMessage,
    reservationKey,
    customer,
    business,
  } = ctx;

  if (!RESERVATION_CACHE) return;
  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  // FINAL OPTION: 1. CONFIRMAR
  if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
    const {
      customerName,
      datetime,
      numberOfPeople = 1,
    } = RESERVATION_CACHE as ReservationState;

    // finally, we create the reservation
    if (customer?.id && business?.id && RESERVATION_CACHE?.id) {
      const timezone = business.general.timezone;
      const { start, end } = datetime;
      const startDateTime = localDateTimeToUTC(start, timezone);
      const endDateTime = localDateTimeToUTC(end, timezone);

      const res = await businessService.updateAppointment(
        RESERVATION_CACHE?.id,
        {
          business: business?.id,
          customer: customer?.id,
          startDateTime,
          endDateTime,
          numberOfPeople,
          customerName: customerName || customer.name || "",
          status: "confirmed",
        },
      );
      const reservation = (await res.json()) as { doc: Appointment };
      const responseMsg = systemMessages.getSuccessMsg(
        reservation?.doc,
        "update",
      );
      await reservationCacheService.delete(reservationKey ?? "");
      return humanizerAgent(responseMsg);
    }
    return humanizerAgent("Customer not created");
  }

  // FINAL OPTION: 2. SALIR
  if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
    await reservationCacheService.delete(reservationKey ?? "");
    const assistantMsg = systemMessages.getExitMsg();
    return assistantMsg;
  }

  // FINAL OPTION: 3. REINGRESAR DATOS
  if (customerMessage?.toUpperCase() === CustomerActions.RESTART) {
    // RESTART
    const assistantResponse = systemMessages.getCreateMsg({
      userName: customer?.name,
    });
    await reservationCacheService.save(reservationKey ?? "", {
      businessId: business?.id,
      customerId: customer?.id,
      ...RESERVATION_CACHE,
      status: ReservationStatuses.UPDATE_STARTED,
    });
    return assistantResponse;
  }

  // FALLBACK
  // if (customerMessage) {
  //   const assistanceMsg = `Tienes una reserva disponible. Escribe: ${CustomerActions.CONFIRM} para confirmar reserva, ${CustomerActions.RESTART} para cambiar algun dato, ó ${CustomerActions.EXIT} para salir`;
  //   return humanizerAgent(assistanceMsg);
  // }
};

export const updateWorkflow = { started, validated };
