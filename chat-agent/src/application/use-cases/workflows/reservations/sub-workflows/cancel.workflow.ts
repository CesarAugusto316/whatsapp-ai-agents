import { humanizerAgent } from "@/application/agents/restaurant/reservation/humanizer-agent";
import { StateWorkflowHandler } from "@/application/patterns/FSM-workflow/state-workflow.types";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import { systemMessages } from "@/domain/restaurant/reservations/prompts/system-messages";
import {
  CustomerActions,
  FMStatus,
} from "@/domain/restaurant/reservations/reservation.types";
import cacheAdapter from "@/infraestructure/adapters/cache.adapter";
import cmsClient from "@/infraestructure/http/cms/cms.client";
import { logger } from "@/infraestructure/logging/logger";
import { DBOS } from "@dbos-inc/dbos-sdk";

/**
 *
 * @param ctx
 * @returns
 */
const started: StateWorkflowHandler<RestaurantCtx, FMStatus> = async (ctx) => {
  const { RESERVATION_STATE, customerMessage, reservationKey, customer } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  if (RESERVATION_STATE?.id) {
    //
    if (customerMessage.toUpperCase() === CustomerActions.CONFIRM) {
      let deleted = false;
      try {
        await DBOS.runStep(
          async () => {
            const res = await cmsClient.updateAppointment(
              RESERVATION_STATE.id!,
              {
                status: "cancelled",
              },
            );
            if (res.status !== 200) {
              throw new Error("Error al cancelar la reserva");
            }
          },
          { name: "cmsClient.updateAppointment" },
        );
        deleted = true;
        const assistantResponse = `Hemos cancelado tu reserva  ${RESERVATION_STATE.id} exitosamente ✅. Gracias por preferirnos`;
        await cacheAdapter.delete(reservationKey);
        logger.info(
          `Reservation ${RESERVATION_STATE.id} cancelled successfully`,
        );
        return humanizerAgent(assistantResponse);
      } catch (error) {
        logger.error("Error al cancelar la reserva", error as Error);
        if (deleted) {
          const assistantResponse = `Hemos cancelado tu reserva  ${RESERVATION_STATE.id} exitosamente ✅. Gracias por preferirnos`;
          await cacheAdapter.delete(reservationKey);
          return assistantResponse;
        } else {
          return "Hubo un problema actualizando tu reserva. Por favor, inténtalo más tarde.";
        }
      }
    }

    // if (customerMessage.toUpperCase() === CustomerActions.EXIT) {
    //   const assistantResponse = systemMessages.getExitMsg();
    //   await cacheAdapter.delete(reservationKey);
    //   return assistantResponse;
    // }
  }
};

export const cancellWorkflow = { started };
