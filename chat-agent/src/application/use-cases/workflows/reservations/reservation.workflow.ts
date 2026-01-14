import { makeWorkflow } from "./sub-workflows/make.workflow";
import { updateWorkflow } from "./sub-workflows/update.workflow";
import { cancellWorkflow } from "./sub-workflows/cancel.workflow";
import { fallbackWorkflow } from "./sub-workflows/conversational-fallback";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import chatHistoryAdapter from "@/infraestructure/adapters/chatHistory.adapter";
import { StateWorkflowRunner } from "@/application/patterns/FSM-workflow/state-workflow-runner";

/**
 *
 * @description Initialize the reservation workflow
 * @param ctx
 * @returns Promise<string>
 */
export async function reservationWorkflow(ctx: RestaurantCtx): Promise<string> {
  const status = ctx.RESERVATION_STATE?.status;
  const business = ctx.business;
  const subWorkflow = new StateWorkflowRunner(ctx, status);

  if (!business.general.isActive) {
    return "El negocio está fuera de servicio, por favor inténtalo más tarde.";
  }

  subWorkflow
    .on("MAKE_STARTED", makeWorkflow.started)
    .on("MAKE_VALIDATED", makeWorkflow.validated)
    .on("UPDATE_STARTED", updateWorkflow.started)
    .on("UPDATE_VALIDATED", updateWorkflow.validated)
    .on("CANCEL_STARTED", cancellWorkflow.started);

  const w1Result = await subWorkflow.run();

  if (w1Result?.success) {
    await chatHistoryAdapter.push(
      ctx.chatKey,
      ctx.customerMessage,
      w1Result.message,
    );
    return w1Result.message;
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

/**
 *
 * @description run the reservation workflow
 * @param ctx
 * @returns Promise<string>
 */
// export const runReservationWorkflow = DBOS.registerWorkflow(
//   reservationWorkflow,
//   { name: "reservation" },
// );
