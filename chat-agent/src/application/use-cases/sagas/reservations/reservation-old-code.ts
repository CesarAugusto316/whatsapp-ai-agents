import { fallbackWorkflow } from "./steps/fallback-steps";
import { RestaurantCtx } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters";
import { InputIntent } from "@/domain/restaurant/reservations";
import { reservationStateOrchestrator } from "./reservation-router";

/**
 *
 * @todo use SagaOrchestrator
 * @description Initialize the reservation workflow
 * @param ctx
 * @returns Promise<string>
 */
export async function reservationSagaOrchestrator(
  ctx: RestaurantCtx,
): Promise<string> {
  const status = ctx.RESERVATION_STATE?.status;
  const business = ctx.business;

  if (!business.general.isActive) {
    return "El negocio está fuera de servicio, por favor inténtalo más tarde.";
  }

  if (status) {
    const { result } = await reservationStateOrchestrator(ctx, status);
    if (result && result !== InputIntent.CUSTOMER_QUESTION) {
      await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, result);
      return result;
    }
  }
  // else {
  //   /** @todo refactor to use SagaOrchestrator and Saga mapper */
  //   FlowOptions;
  //   // 1. FLOW SELECTION & INITIALIZATION (pre-FSM, no authoritative)
  // }

  /**
   *
   * @todo refactor to use SagaOrchestrator
   * @see makeStarted
   * @see updateStarted
   * @see {InputIntent}
   */
  const w2Result: string = await fallbackWorkflow(ctx);
  await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, w2Result);
  return w2Result;
}
