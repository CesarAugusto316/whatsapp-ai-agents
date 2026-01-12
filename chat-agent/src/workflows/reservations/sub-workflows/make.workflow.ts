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
import { collecDataSteps } from "../steps/collect-data.steps";
import { logger } from "@/middlewares/logger-middleware";
import { DBOS } from "@dbos-inc/dbos-sdk";

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

  return collecDataSteps({
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
  let reservation: { doc: Appointment } | undefined;
  let newCustomer: Customer | undefined;

  // FINAL OPTION: 1. CONFIRMAR
  if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
    } = RESERVATION_CACHE as ReservationState;

    newCustomer = customer;
    if (!customer && customerName) {
      newCustomer = await DBOS.runStep(
        async () =>
          (
            (await (
              await cmsService.createCostumer({
                business: business?.id || "",
                phoneNumber: customerPhone || "",
                name: customerName,
              })
            ).json()) as { doc: Customer }
          )?.doc,
        { name: "cmsService.createCostumer" },
      );
    }

    try {
      if (newCustomer?.id && business?.id) {
        const timezone = business.general.timezone;
        const startDateTime = localDateTimeToUTC(datetime?.start, timezone);
        const endDateTime = localDateTimeToUTC(datetime?.end, timezone);
        reservation = await DBOS.runStep(
          async () => {
            return (await (
              await cmsService.createAppointment({
                business: business.id,
                customer: newCustomer?.id!,
                startDateTime,
                endDateTime,
                customerName: newCustomer?.name!,
                numberOfPeople,
                status: "confirmed",
              })
            ).json()) as { doc: Appointment };
          },
          { name: "cmsService.createAppointment" },
        );

        const assistantMsg = systemMessages.getSuccessMsg(
          {
            id: reservation?.doc?.id,
            datetime,
            customerName: customerName || customer?.name || "",
            numberOfPeople,
          },
          timezone,
          "create",
        );
        await reservationCacheService.delete(reservationKey ?? "");
        logger.info("Customer selected an option", {
          customerAction: CustomerActions.CONFIRM,
          customerMessage,
        });
        return humanizerAgent(assistantMsg);
      } else {
        return "Tu perfil no pudo ser creado, Intentalo más tarde";
      }
    } catch (error) {
      if (reservation && reservation?.doc?.id) {
        await DBOS.runStep(
          async () => await cmsService.deleteAppointment(reservation?.doc?.id!),
          { name: "cmsService.deleteAppointment" },
        );

        throw error; // DBOS reintentará el flujo desde el último checkpoint
      }
      return "Hubo un problema procesando tu reserva. Inténtalo más tarde.";
    }
  }

  // FINAL OPTION: 2. SALIR
  if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
    await reservationCacheService.delete(reservationKey ?? "");
    const assistantMsg = systemMessages.getExitMsg();
    logger.info("Customer selected an option", {
      customerAction: CustomerActions.EXIT,
      customerMessage,
    });
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
    logger.info("Customer selected an option", {
      customerAction: CustomerActions.RESTART,
      customerMessage,
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

export const makeWorkflow = { started, validated };
