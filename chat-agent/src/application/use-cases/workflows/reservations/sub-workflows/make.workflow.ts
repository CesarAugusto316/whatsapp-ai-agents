import { StateWorkflowHandler } from "@/application/patterns/FSM-workflow/state-workflow.types";
import { collecDataSteps } from "../steps/collect-data.steps";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import {
  CustomerActions,
  FMStatus,
  ReservationState,
  ReservationStatuses,
} from "@/domain/restaurant/reservations/reservation.types";
import { Appointment, Customer } from "@/infraestructure/http/cms/cms-types";
import cmsClient from "@/infraestructure/http/cms/cms.client";
import { localDateTimeToUTC } from "@/domain/utilities/datetime-formatting/datetime-converters";
import { systemMessages } from "@/domain/restaurant/reservations/prompts/system-messages";
import cacheAdapter from "@/infraestructure/adapters/cache.adapter";
import { logger } from "@/infraestructure/logging/logger";
import { humanizerAgent } from "@/application/agents/restaurant/reservation/humanizer-agent";

/**
 *
 * @param ctx
 * @param fmStatus
 * @returns
 */
const started: StateWorkflowHandler<RestaurantCtx, FMStatus> = async (
  ctx,
  fmStatus,
) => {
  const {
    RESERVATION_STATE,
    business,
    customerMessage,
    reservationKey,
    customer,
  } = ctx;

  if (!RESERVATION_STATE) return;

  return collecDataSteps({
    reservation: RESERVATION_STATE,
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
const validated: StateWorkflowHandler<RestaurantCtx, FMStatus> = async (
  ctx,
) => {
  const {
    RESERVATION_STATE,
    business,
    customerMessage,
    customerPhone,
    customer,
    reservationKey,
  } = ctx;

  if (!RESERVATION_STATE) return;
  let reservation: { doc: Appointment } | undefined;
  let newCustomer: Customer | undefined;

  // FINAL OPTION: 1. CONFIRMAR
  if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
    } = RESERVATION_STATE as ReservationState;

    newCustomer = customer;
    if (!customer && customerName) {
      newCustomer = await DBOS.runStep(
        async () =>
          (
            (await (
              await cmsClient.createCostumer({
                business: business?.id || "",
                phoneNumber: customerPhone || "",
                name: customerName,
              })
            ).json()) as { doc: Customer }
          )?.doc,
        { name: "cmsClient.createCostumer" },
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
              await cmsClient.createAppointment({
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
          { name: "cmsClient.createAppointment" },
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
        await cacheAdapter.delete(reservationKey ?? "");
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
          async () => await cmsClient.deleteAppointment(reservation?.doc?.id!),
          { name: "cmsClient.deleteAppointment" },
        );

        logger.error("Error deleting appointment", error as Error); // DBOS reintentará el flujo desde el último checkpoint
      }
      return "Hubo un problema procesando tu reserva. Inténtalo más tarde.";
    }
  }

  // FINAL OPTION: 2. SALIR
  if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
    await cacheAdapter.delete(reservationKey ?? "");
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
    await cacheAdapter.save(reservationKey ?? "", {
      businessId: business?.id,
      customerId: customer?.id,
      ...RESERVATION_STATE,
      status: ReservationStatuses.MAKE_STARTED,
    });
    logger.info("Customer selected an option", {
      customerAction: CustomerActions.RESTART,
      customerMessage,
    });
    return humanizerAgent(assistantResponse);
  }

  // // FALLBACK
  // if (customerMessage && RESERVATION_STATE) {
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
