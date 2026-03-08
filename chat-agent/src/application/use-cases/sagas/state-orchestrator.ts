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
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { ragService } from "@/application/services/rag";

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
 *
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
    const menu = await ragService.searchBusinessMedia(
      "media alt",
      ctx.businessId,
    );

    const products = await ragService.searchProducts(
      "product description",
      ctx.businessId,
    );

    let input: ChatMessage[] = [{ role: "user", content: message }];

    const res = await aiAdapter.generateText({
      tools: [
        {
          type: "function",
          function: {
            name: "search_products",
            description:
              "Search for products by name or description similarity. Use this when the user wants to find products based on what they're looking for.",
            parameters: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description: "Product description the user is looking for",
                },
              },
              // required: [],
              additionalProperties: false,
            },
          },
        },
      ],
      messages: input,
    });

    console.log("Final input:");
    console.log(JSON.stringify(input, null, 2));

    return formatSagaOutput(res);
    // return new SagaOrchestrator({ ctx })
    //   .addStep({
    //     config: { execute: "", compensate: "" },
    //     execute: async ({ ctx }) => {
    //       return {};
    //     },
    //   })
    //   .start();
    //
  }

  // ============================================
  // 1. POMDP (heuristic-light-pragmatic) entry point
  // ============================================
  return conversationalWorkflow(ctx);
};
