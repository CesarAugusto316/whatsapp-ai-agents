import { FMStatus, InputIntent } from "@/types/reservation/reservation.types";
import chatHistoryService from "@/services/chatHistory.service";
import { AppContext } from "@/types/hono.types";
import { makeWorflow } from "./make.workflow";
import { updateWorkflow } from "./update.workflow";
import { cancellWorkflow } from "./cancel.workflow";
import { StateWorkflowRunner } from "@/workflow-fsm/state-workflow-runner";
import { resolveConversationalFallback } from "./conversational-fallback";

/**
 *
 * @description Initialize the reservation workflow
 * @param ctx
 * @returns Promise<string>
 */
export async function runReservationWorkflow(ctx: AppContext): Promise<string> {
  const status = ctx.RESERVATION_CACHE?.status;
  const workflow = new StateWorkflowRunner<AppContext, FMStatus>(ctx, status);

  workflow
    .on("MAKE_STARTED", makeWorflow.started)
    .on("MAKE_VALIDATED", makeWorflow.validated)
    .on("UPDATE_STARTED", updateWorkflow.started)
    .on("UPDATE_VALIDATED", updateWorkflow.validated)
    .on("CANCEL_STARTED", cancellWorkflow.started);

  const workflowResult = await workflow.run();

  if (workflowResult && workflowResult !== InputIntent.CUSTOMER_QUESTION) {
    await chatHistoryService.save(
      ctx.chatKey,
      ctx.customerMessage,
      workflowResult,
    );
    return workflowResult;
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
  const fallback: string = await resolveConversationalFallback(ctx);
  await chatHistoryService.save(ctx.chatKey, ctx.customerMessage, fallback);
  return fallback;
}
