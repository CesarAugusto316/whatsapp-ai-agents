import chatHistoryService from "@/services/chatHistory.service";
import { AppContext } from "@/types/hono.types";
import { makeWorkflow } from "./make.workflow";
import { updateWorkflow } from "./update.workflow";
import { cancellWorkflow } from "./cancel.workflow";
import { StateWorkflowRunner } from "@/workflow-fsm/state-workflow-runner";
import { conversationalFallbackWorkflow as fallbackWorkflow } from "./conversational-fallback";

/**
 *
 * @description Initialize the reservation workflow
 * @param ctx
 * @returns Promise<string>
 */
export async function runReservationWorkflow(ctx: AppContext): Promise<string> {
  const status = ctx.RESERVATION_CACHE?.status;
  const business = ctx.business;
  const optionsWorkflow = new StateWorkflowRunner(ctx, status);

  if (!business.general.isActive) {
    return "El negocio está fuera de servicio, por favor inténtalo más tarde.";
  }

  optionsWorkflow
    .on("MAKE_STARTED", makeWorkflow.started)
    .on("MAKE_VALIDATED", makeWorkflow.validated)
    .on("UPDATE_STARTED", updateWorkflow.started)
    .on("UPDATE_VALIDATED", updateWorkflow.validated)
    .on("CANCEL_STARTED", cancellWorkflow.started);

  const w1Result = await optionsWorkflow.run("reservation");

  if (w1Result?.success) {
    await chatHistoryService.save(
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
  await chatHistoryService.save(ctx.chatKey, ctx.customerMessage, w2Result);
  return w2Result;
}
