import { StateWorkflowHandler } from "@/application/patterns/FSM-workflow/state-workflow.types";
import { collecDataSteps } from "../steps/collect-data.steps";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { ReservationCtx } from "@/domain/context.types";
import {
  CustomerActions,
  FMStatus,
  ReservationState,
  ReservationStatuses,
} from "@/domain/reservation/reservation.types";
import { localDateTimeToUTC } from "@/application/helpers/datetime-converters";
import cmsService from "@/infraestructure/services/cms/cms.service";
import { Appointment } from "@/infraestructure/services/cms/cms-types";
import { systemMessages } from "@/domain/llm/prompts/system-messages";
import reservationCacheService from "@/infraestructure/services/reservationCache.service";
import { logger } from "@/application/helpers/logger";
import { humanizerAgent } from "@/infraestructure/services/llm/llm.service";

const started: StateWorkflowHandler<ReservationCtx, FMStatus> = async (
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

  return collecDataSteps({
    reservation: RESERVATION_CACHE,
    customer,
    business,
    reservationKey,
    fmStatus,
    customerMessage,
    mode: "update",
  });
};

const validated: StateWorkflowHandler<ReservationCtx, FMStatus> = async (
  ctx,
) => {
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
    let updated = false;

    try {
      // finally, we create the reservation
      if (customer?.id && business?.id && RESERVATION_CACHE?.id) {
        const timezone = business.general.timezone;
        const { start, end } = datetime;
        const startDateTime = localDateTimeToUTC(start, timezone);
        const endDateTime = localDateTimeToUTC(end, timezone);

        const reservation = await DBOS.runStep(
          async () =>
            (await (
              await cmsService.updateAppointment(RESERVATION_CACHE?.id!, {
                business: business?.id,
                customer: customer?.id,
                startDateTime,
                endDateTime,
                numberOfPeople,
                customerName: customerName || customer.name || "",
                status: "confirmed",
              })
            ).json()) as { doc: Appointment },
          { name: "cmsService.updateAppointment" },
        );

        updated = true;

        const responseMsg = systemMessages.getSuccessMsg(
          {
            id: reservation?.doc.id,
            customerName: customerName || customer?.name || "",
            datetime,
            numberOfPeople,
          },
          timezone,
          "update",
        );
        await reservationCacheService.delete(reservationKey ?? "");
        logger.info("Customer selected an option", {
          customerAction: CustomerActions.CONFIRM,
          customerMessage,
        });

        return humanizerAgent(responseMsg);
      } else {
        await reservationCacheService.delete(reservationKey ?? "");
        return "No se pudo actualizar la reserva, Vuelve a intentarlo más tarde.";
      }
    } catch (error) {
      // ============================================
      // COMPENSACIÓN: Nota sobre actualización
      // ============================================
      // En actualización no podemos "deshacer" fácilmente porque:
      // 1. No tenemos el estado anterior completo
      // 2. Update es idempotente (reintentar no causa problemas)
      // 3. Si falla algo después del update, la cita ya está actualizada

      logger.error("Error during update confirmation", error as Error);

      // Aún así, intentamos limpiar la caché para evitar estados inconsistentes
      try {
        await reservationCacheService.delete(reservationKey ?? "");
      } catch (cacheError) {
        logger.error(
          "Failed to clean cache after update error",
          cacheError as Error,
        );
      }

      if (updated) {
        return (
          "Tu reserva ha sido actualizada, pero hubo un problema al enviar la confirmación. " +
          "Por favor, verifica el estado de tu reserva directamente."
        );
      } else {
        return "Hubo un problema actualizando tu reserva. Por favor, inténtalo más tarde.";
      }
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
      status: ReservationStatuses.UPDATE_STARTED,
    });
    logger.info("Customer selected an option", {
      customerAction: CustomerActions.RESTART,
      customerMessage,
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
