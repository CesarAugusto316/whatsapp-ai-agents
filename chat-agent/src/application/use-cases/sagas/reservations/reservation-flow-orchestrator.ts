import { fallbackWorkflow } from "./conversational-fallback";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import chatHistoryAdapter from "@/infraestructure/adapters/chatHistory.adapter";
import { reservationSagaMapper } from "./reservation-mapper";
import {
  FlowOptions,
  InputIntent,
} from "@/domain/restaurant/reservations/reservation.types";

/**
 *
 * @todo use SagaOrchestrator
 * @description Initialize the reservation workflow
 * @param ctx
 * @returns Promise<string>
 */
export async function reservationFlowOrchestrator(
  ctx: RestaurantCtx,
): Promise<string> {
  const status = ctx.RESERVATION_STATE?.status;
  const business = ctx.business;

  if (!business.general.isActive) {
    return "El negocio está fuera de servicio, por favor inténtalo más tarde.";
  }

  if (status) {
    const { result } = await reservationSagaMapper(ctx, status);
    if (result && result !== InputIntent.CUSTOMER_QUESTION) {
      await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, result);
      return result;
    }
  } else {
    FlowOptions;
    // 1. FLOW SELECTION & INITIALIZATION (pre-FSM, no authoritative)
  }

  /**
   *
   * @todo mange case when user asks a question and is currently inside a FLOW/EVENT
   * IF result == InputIntent.CUSTOMER_QUESTION, then the AGENT SHOULD
   * invite the user to continue the FLOW: MAKE_STARTED, UPDATE_STARTED
   * @see makeStarted
   * @see updateStarted
   * @see {InputIntent}
   */
  const w2Result: string = await fallbackWorkflow(ctx);
  await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, w2Result);
  return w2Result;
}
