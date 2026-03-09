import { FMStatus } from "@/domain/booking";
import { BookingSagaResult, reservationSaga } from "./booking/booking-saga";
import type { DomainCtx } from "@/domain/booking";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import type {
  StartedFuncSagaResult,
  ValidateFuncSagaResult,
} from "./booking/steps";
import { formatSagaOutput, SagaOrchestrator } from "@/application/patterns";
import { InputType } from "@/domain/booking/input-parser";
import { conversationalWorkflow } from "./conversational-workflow";
import { handleProductOrderWithTools } from "@/infraestructure/adapters/ai/tool-executor";

const MAX_WORDS = 60;

const bookingSagaMap: Partial<
  Record<FMStatus, StartedFuncSagaResult | ValidateFuncSagaResult>
> = {
  MAKE_STARTED: reservationSaga.makeStarted,
  MAKE_VALIDATED: reservationSaga.makeValidated,

  UPDATE_STARTED: reservationSaga.updateStarted,
  UPDATE_VALIDATED: reservationSaga.updateValidated,

  CANCEL_VALIDATED: reservationSaga.cancelValidated,
};

/**
 * @param ctx
 * @returns
 */
export const stateOrchestrator = async (
  ctx: DomainCtx,
): Promise<BookingSagaResult> => {
  //
  const bookingStatus = ctx.bookingState?.status;
  const productOrdeStatus = ctx.productOrderState?.status;
  const business = ctx.business;
  const message = ctx.customerMessage;
  const words = message.split(" ");

  if (words.length > MAX_WORDS) {
    return formatSagaOutput(
      `Por favor resume tu consulta en máximo ${MAX_WORDS} palabras. 😊`,
      "MAX_WORDS_REACHED",
    );
  }
  if (!business.general.isActive) {
    return formatSagaOutput(
      "El negocio está fuera de servicio, por favor inténtalo más tarde.",
      "OUT_OF_SERVICE",
    );
  }
  if (bookingStatus) {
    // ============================================
    // 2.DETERMINISTIC SAGA ORCHESTRATOR
    // For every workflow option there is a FSM transition
    // ============================================
    const sagaOrchestrator = bookingSagaMap[bookingStatus];
    if (!sagaOrchestrator) {
      throw new Error(`No saga found for status ${bookingStatus}`);
    }
    const { lastStepResult, bag } = await sagaOrchestrator(ctx);
    const result =
      lastStepResult?.execute?.result ||
      lastStepResult?.compensate?.result ||
      "";
    if (result && result !== InputType.INFORMATION_REQUEST) {
      await chatHistoryAdapter.push(ctx.chatKey, message, result);
      return { bag, lastStepResult };
    }
  }

  if (productOrdeStatus) {
    return handleProductOrderWithTools(ctx, message);
  }

  // ============================================
  // 1. POMDP (heuristic-light-pragmatic) entry point
  // ============================================
  return conversationalWorkflow(ctx);
};
