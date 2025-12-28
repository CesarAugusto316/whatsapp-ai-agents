import {
  aiClient,
  classifyCustomerIntent,
  infoReservationAgent,
} from "@/ai-agents/agent.config";
import {
  CUSTOMER_INTENT,
  ReservationStatus,
  FlowOptions,
  reservationStatuses,
} from "@/ai-agents/agent.types";
import { renderAssistantText } from "@/ai-agents/tools/helpers";
import {
  howSystemWorksPrompt,
  reservationMessages,
} from "@/ai-agents/tools/prompts";
import chatHistoryService from "@/services/chatHistory.service";
import reservationCacheService from "@/services/reservationCache.service";
import { AppContext } from "@/types/hono.types";
import { ModelMessage } from "ai";
import { FlowHandler, FlowResult } from "./handlers.types";
import { makeStarted, makeValidated } from "./reservations/make.handlers";
import { cancelStarted } from "./reservations/cancel.handlers";
import {
  updatePreStart,
  updateStarted,
  updateValidated,
} from "./reservations/update.handlers";

/**
 *
 * @description deterministic chat flow, here core business logic lives
 */
class CoreFlow {
  private handlers: Record<string, FlowHandler[]> = {};

  constructor(public readonly ctx: Readonly<AppContext>) {}

  on(event: ReservationStatus, handler: FlowHandler): this {
    (this.handlers[event] ??= []).push(handler);
    return this;
  }

  /**
   *
   * @description if run() returns void, it means no handler was executed.
   * This is OK
   */
  async run(): Promise<FlowResult | void> {
    const status = this.ctx.RESERVATION_CACHE?.status;
    if (!status) return;

    const handlers = this.handlers[status] ?? [];
    for (const h of handlers) {
      const res = await h(this.ctx);
      if (res) return res;
    }
  }
}

/**
 *
 * @description no-deterministic chat flow, here we can use ai-agents,
 * no-critical logic lives here.
 */
async function fallbackFlow(ctx: AppContext): Promise<string> {
  const {
    RESERVATION_CACHE,
    customerMessage = "",
    customerPhone = "",
    reservationKey = "",
    customer,
    business,
    chatKey = "",
  } = ctx;

  // 1. DETERMINISTIC FLOW AND CORE BUSINESS LOGIC
  if (!RESERVATION_CACHE) {
    //
    const chatHistoryCache = await chatHistoryService.get(chatKey);
    const isFirstMessage = chatHistoryCache.length === 0;
    if (isFirstMessage) {
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: `
            Este es un mensaje inicial, debes saludarme y explicarme como hacer una reserva rápidamente.
            ${customer?.name ? `Mi nombre es ${customer.name}` : ""}
            Esta es mi pregunta:
            - ${customerMessage}
          `,
        },
      ];
      const assistantResponse = aiClient(
        messages,
        howSystemWorksPrompt(business?.name),
      );
      return assistantResponse;
    }
    if (customerMessage == FlowOptions.MAKE_RESERVATION) {
      // choice 2
      const assistantResponse = reservationMessages.getStartMsg({
        userName: customer?.name,
      });
      await reservationCacheService.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: reservationStatuses.MAKE_STARTED,
      });
      return assistantResponse;
    }
    if (customerMessage == FlowOptions.UPDATE_RESERVATION) {
      // choice 3
      const assistantResponse = reservationMessages.enterReservationId();
      await reservationCacheService.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: reservationStatuses.UPDATE_PRE_START,
      });
      return assistantResponse;
    }
  }

  const chatHistoryCache = await chatHistoryService.get(chatKey);
  const messages: ModelMessage[] = [
    ...chatHistoryCache, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
    {
      role: "user",
      content: customerMessage,
    },
  ];

  // 2. INTENT HANDLING WHEN CUSTOMER ASKS THE HOW OF SOMETHING
  const customerIntent = await classifyCustomerIntent(customerMessage);

  // 3. AI EXPLANATION OF HOW THE SYSTEM WORKS
  if (customerIntent === CUSTOMER_INTENT.HOW) {
    // choice 4 again
    const assistantResponse = aiClient(
      messages,
      howSystemWorksPrompt(business?.name),
    );
    return assistantResponse;
  }

  // 4. DEFAULT FALLBACK WITH AI AGENT WHEN CUSTOMER ASKS THE WHAT OF SOMETHING
  const result = await infoReservationAgent({
    messages,
    business,
    customerPhone,
  });
  const assistantResponse = renderAssistantText(result);
  return assistantResponse;
}

/**
 *
 * @description Initialize the chat flow
 * @param ctx
 * @returns Promise<string>
 */
export async function initChatFlow(ctx: AppContext): Promise<string> {
  const coreFlow = new CoreFlow(ctx);

  coreFlow
    .on("MAKE_STARTED", makeStarted)
    .on("MAKE_VALIDATED", makeValidated)
    .on("CANCEL_STARTED", cancelStarted)
    .on("UPDATE_PRE_START", updatePreStart)
    .on("UPDATE_STARTED", updateStarted)
    .on("UPDATE_VALIDATED", updateValidated);

  const result = await coreFlow.run();

  if (result) {
    await chatHistoryService.save(ctx.chatKey, ctx.customerMessage, result);
    return result;
  }
  const preResult = await fallbackFlow(ctx);
  await chatHistoryService.save(ctx.chatKey, ctx.customerMessage, preResult);
  return preResult;
}
