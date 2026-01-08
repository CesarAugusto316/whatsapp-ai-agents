import { StateWorkflowHandler } from "@/workflow-fsm/state-workflow.types";
import cmsService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import {
  CustomerActions,
  ReservationState,
  ReservationStatuses,
  FMStatus,
} from "@/types/reservation/reservation.types";
import { Appointment, Customer } from "@/types/business/cms-types";
import { humanizerAgent } from "@/llm/llm.config";
import { AppContext } from "@/types/hono.types";
import { systemMessages } from "@/llm/prompts/system-messages";
import { localDateTimeToUTC } from "@/helpers/datetime-converters";
import { collecDataTask } from "./tasks/collect-data.task";

/**
 *
 * @param ctx
 * @param fmStatus
 * @returns
 */
const started: StateWorkflowHandler<AppContext, FMStatus> = async (
  ctx,
  fmStatus,
) => {
  const {
    RESERVATION_CACHE,
    business,
    customerMessage,
    reservationKey,
    customer,
  } = ctx;

  if (!RESERVATION_CACHE) return;

  return collecDataTask({
    reservation: RESERVATION_CACHE,
    customer,
    business,
    reservationKey,
    fmStatus,
    customerMessage,
    mode: "create",
  });
};

/**
 *
 * @param ctx
 * @returns
 */
const validated: StateWorkflowHandler<AppContext, FMStatus> = async (ctx) => {
  const {
    RESERVATION_CACHE,
    business,
    customerMessage,
    customerPhone,
    customer,
    reservationKey,
  } = ctx;

  if (!RESERVATION_CACHE) return;

  // FINAL OPTION: 1. CONFIRMAR
  if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
    } = RESERVATION_CACHE as ReservationState;

    let newCustomer = customer;
    if (!customer && customerName) {
      newCustomer = (
        (await (
          await cmsService.createCostumer({
            business: business?.id || "",
            phoneNumber: customerPhone || "",
            name: customerName,
          })
        ).json()) as { doc: Customer }
      ).doc;
    }
    // finally, we create the reservation
    if (newCustomer?.id && business?.id) {
      const timezone = business.general.timezone;
      const startDateTime = localDateTimeToUTC(datetime?.start, timezone);
      const endDateTime = localDateTimeToUTC(datetime?.end, timezone);
      const res = await cmsService.createAppointment({
        business: business.id,
        customer: newCustomer.id,
        startDateTime,
        endDateTime,
        customerName: newCustomer.name,
        numberOfPeople,
        status: "confirmed",
      });
      const reservation = (await res.json()) as { doc: Appointment };
      const assistantMsg = systemMessages.getSuccessMsg(
        {
          id: reservation?.doc.id,
          datetime,
          numberOfPeople,
        },
        timezone,
        "create",
      );
      await reservationCacheService.delete(reservationKey ?? "");
      return humanizerAgent(assistantMsg);
    }
    return humanizerAgent("Cliente no pudo ser creado, falta el nombre");
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
      status: ReservationStatuses.MAKE_STARTED,
    });
    return humanizerAgent(assistantResponse);
  }

  // // FALLBACK
  // if (customerMessage && RESERVATION_CACHE) {
  //   const assistanceMsg = `
  //     Tienes una reserva disponible. Escribe:
  //     - ${CustomerActions.CONFIRM} para confirmar reserva ó
  //     - ${CustomerActions.RESTART} para cambiar algun dato que quieras cambiar
  //     - ${CustomerActions.EXIT} para salir de este proceso
  //     `;
  //   return humanizerAgent(assistanceMsg);
  // }
};

export const makeWorflow = { started, validated };
