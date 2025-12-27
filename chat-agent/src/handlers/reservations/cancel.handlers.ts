import { FlowHandler } from "../handlers.types";
import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import { CustomerActions } from "@/ai-agents/agent.types";
import { flowMessages } from "@/ai-agents/tools/prompts";

export const cancelStarted: FlowHandler = async (ctx) => {
  const { RESERVATION_CACHE, customerMessage, reservationKey, customer } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  if (RESERVATION_CACHE?.id) {
    //
    if (customerMessage.toUpperCase() === CustomerActions.YES) {
      const res = await businessService.updateAppointment(
        RESERVATION_CACHE.id,
        { status: "cancelled" },
      );
      if (res.status !== 200) {
        return `Error al cancelar la reserva ${RESERVATION_CACHE.id}`;
      }
      const assistantResponse = `Reserva ${RESERVATION_CACHE.id} cancelada exitosamente ✅`;
      await reservationCacheService.delete(reservationKey);
      return assistantResponse;
    }
    if (customerMessage.toUpperCase() === CustomerActions.NO) {
      const assistantResponse = flowMessages.getExitMsg();
      await reservationCacheService.delete(reservationKey);
      return assistantResponse;
    }
    if (customerMessage) {
      const assistantResponse = `Escribe ${CustomerActions.YES} para confirmar o ${CustomerActions.NO} para cancelar`;
      return assistantResponse;
    }
  }
};
