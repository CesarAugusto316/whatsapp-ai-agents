import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import { CustomerActions, FMStatus } from "@/ai-agents/agent.types";
import { systemMessages } from "@/ai-agents/tools/prompts";
import { humanizerAgent } from "@/ai-agents/agent.config";
import { AppContext } from "@/types/hono.types";
import { StateHandler } from "@/ai-agents/finite-state-machine/state-handler.types";

const started: StateHandler<AppContext, FMStatus> = async (ctx) => {
  const { RESERVATION_CACHE, customerMessage, reservationKey, customer } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  if (RESERVATION_CACHE?.id) {
    //
    if (customerMessage.toUpperCase() === CustomerActions.CONFIRM) {
      const res = await businessService.updateAppointment(
        RESERVATION_CACHE.id,
        { status: "cancelled" },
      );
      if (res.status !== 200) {
        return `Error al cancelar la reserva ${RESERVATION_CACHE.id}`;
      }
      const assistantResponse = `Hemos cancelado tu reserva  ${RESERVATION_CACHE.id} exitosamente ✅. Gracias por preferirnos`;
      await reservationCacheService.delete(reservationKey);
      return humanizerAgent(assistantResponse);
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

export const cancellHandlers = { started };
