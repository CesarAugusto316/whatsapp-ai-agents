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
import { localDateTimeToUTC } from "@/domain/utilities/datetime-formatting/datetime-converters";
import cmsClient from "@/infraestructure/http/cms/cms.client";
import { Appointment } from "@/infraestructure/http/cms/cms-types";
import { systemMessages } from "@/domain/restaurant/reservations/prompts/system-messages";
import cacheAdapter from "@/infraestructure/adapters/cache.adapter";
import { logger } from "@/infraestructure/logging/logger";
import { humanizerAgent } from "@/application/agents/restaurant/reservation/humanizer-agent";

const started: StateWorkflowHandler<RestaurantCtx, FMStatus> = async (
  ctx,
  fmStatus,
) => {
  const {
    RESERVATION_STATE,
    customerMessage,
    reservationKey,
    customer,
    business,
  } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  if (!RESERVATION_STATE) return;
  if (!RESERVATION_STATE.id) return;

  return collecDataSteps({
    reservation: RESERVATION_STATE,
    customer,
    business,
    reservationKey,
    fmStatus,
    customerMessage,
    mode: "update",
  });
};

const validated: StateWorkflowHandler<RestaurantCtx, FMStatus> = async (
  ctx,
) => {
  const {
    RESERVATION_STATE,
    customerMessage,
    reservationKey,
    customer,
    business,
  } = ctx;

  if (!RESERVATION_STATE) return;
  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  // FINAL OPTION: 1. CONFIRMAR
  if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
    const {
      customerName,
      datetime,
      numberOfPeople = 1,
    } = RESERVATION_STATE as ReservationState;
    let updated = false;

    try {
      // finally, we create the reservation
      if (customer?.id && business?.id && RESERVATION_STATE?.id) {
        const timezone = business.general.timezone;
        const { start, end } = datetime;
        const startDateTime = localDateTimeToUTC(start, timezone);
        const endDateTime = localDateTimeToUTC(end, timezone);

        const reservation = await DBOS.runStep(
          async () =>
            (await (
              await cmsClient.updateAppointment(RESERVATION_STATE?.id!, {
                business: business?.id,
                customer: customer?.id,
                startDateTime,
                endDateTime,
                numberOfPeople,
                customerName: customerName || customer.name || "",
                status: "confirmed",
              })
            ).json()) as { doc: Appointment },
          { name: "cmsClient.updateAppointment" },
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
        await cacheAdapter.delete(reservationKey ?? "");
        logger.info("Customer selected an option", {
          customerAction: CustomerActions.CONFIRM,
          customerMessage,
        });

        return humanizerAgent(responseMsg);
      } else {
        await cacheAdapter.delete(reservationKey ?? "");
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
        await cacheAdapter.delete(reservationKey ?? "");
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
      status: ReservationStatuses.UPDATE_STARTED,
    });
    logger.info("Customer selected an option", {
      customerAction: CustomerActions.RESTART,
      customerMessage,
    });
    return assistantResponse;
  }
};

export const updateWorkflow = { started, validated };
