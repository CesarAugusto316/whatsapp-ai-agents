import { humanizerAgent } from "@/llm/llm.config";
import {
  CustomerActions,
  FMStatus,
} from "@/types/reservation/reservation.types";
import cmsService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import { AppContext } from "@/types/hono.types";
import { StateWorkflowHandler } from "@/workflow-fsm/state-workflow.types";
import { systemMessages } from "@/llm/prompts/system-messages";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { logger } from "@/middlewares/logger-middleware";

/**
 *
 * @param ctx
 * @returns
 */
const started: StateWorkflowHandler<AppContext, FMStatus> = async (ctx) => {
  const { RESERVATION_CACHE, customerMessage, reservationKey, customer } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  if (RESERVATION_CACHE?.id) {
    //
    if (customerMessage.toUpperCase() === CustomerActions.CONFIRM) {
      let deleted = false;
      try {
        await DBOS.runStep(
          async () => {
            const res = await cmsService.updateAppointment(
              RESERVATION_CACHE.id!,
              {
                status: "cancelled",
              },
            );
            if (res.status !== 200) {
              throw new Error("Error al cancelar la reserva");
            }
          },
          { name: "cmsService.updateAppointment" },
        );
        deleted = true;
        const assistantResponse = `Hemos cancelado tu reserva  ${RESERVATION_CACHE.id} exitosamente ✅. Gracias por preferirnos`;
        await reservationCacheService.delete(reservationKey);
        logger.info(
          `Reservation ${RESERVATION_CACHE.id} cancelled successfully`,
        );
        return humanizerAgent(assistantResponse);
      } catch (error) {
        logger.error("Error al cancelar la reserva", error as Error);
        if (deleted) {
          const assistantResponse = `Hemos cancelado tu reserva  ${RESERVATION_CACHE.id} exitosamente ✅. Gracias por preferirnos`;
          await reservationCacheService.delete(reservationKey);
          return assistantResponse;
        } else {
          return "Hubo un problema actualizando tu reserva. Por favor, inténtalo más tarde.";
        }
      }
    }
    if (customerMessage.toUpperCase() === CustomerActions.EXIT) {
      const assistantResponse = systemMessages.getExitMsg();
      await reservationCacheService.delete(reservationKey);
      return assistantResponse;
    }
    // if (customerMessage) {
    //   const assistantResponse = `Escribe "${CustomerActions.YES}" para cancelar tu reserva o "${CustomerActions.NO}" para salir de este proceso`;
    //   return humanizerAgent(assistantResponse);
    // }
  }
};

export const cancellWorkflow = { started };
