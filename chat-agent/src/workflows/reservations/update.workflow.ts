import cmsService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import {
  CustomerActions,
  ReservationState,
  ReservationStatuses,
  FMStatus,
} from "@/types/reservation/reservation.types";
import { Appointment } from "@/types/business/cms-types";
import { humanizerAgent } from "@/llm/llm.config";
import { AppContext } from "@/types/hono.types";
import { StateWorkflowHandler } from "@/workflow-fsm/state-workflow.types";
import { systemMessages } from "@/llm/prompts/system-messages";
import { localDateTimeToUTC } from "@/helpers/datetime-converters";
import { collecDataTask } from "./tasks/collect-data.task";

const started: StateWorkflowHandler<AppContext, FMStatus> = async (
  ctx,
  fmStatus,
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
  if (!RESERVATION_CACHE.id) return;

  return collecDataTask({
    reservation: RESERVATION_CACHE,
    customer,
    business,
    reservationKey,
    fmStatus,
    customerMessage,
    mode: "update",
  });
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

      const res = await cmsService.updateAppointment(RESERVATION_CACHE?.id, {
        business: business?.id,
        customer: customer?.id,
        startDateTime,
        endDateTime,
        numberOfPeople,
        customerName: customerName || customer.name || "",
        status: "confirmed",
      });
      const reservation = (await res.json()) as { doc: Appointment };
      const responseMsg = systemMessages.getSuccessMsg(
        {
          id: reservation?.doc.id,
          datetime,
          numberOfPeople,
        },
        timezone,
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
