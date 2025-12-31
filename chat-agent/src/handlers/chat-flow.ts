import {
  aiClient,
  customerIntentClassifier,
  humanizerAgent,
  infoReservationAgent,
} from "@/ai-agents/agent.config";
import {
  CUSTOMER_INTENT,
  ReservationStatus,
  FlowOptions,
  reservationStatuses,
  InputIntent,
} from "@/ai-agents/agent.types";
import { renderAssistantText } from "@/ai-agents/tools/helpers";
import {
  howSystemWorksPrompt,
  systemMessages,
} from "@/ai-agents/tools/prompts";
import chatHistoryService from "@/services/chatHistory.service";
import reservationCacheService from "@/services/reservationCache.service";
import { AppContext } from "@/types/hono.types";
import { ModelMessage } from "ai";
import { StateHandler, StateResult } from "./handlers.types";
import { makeHandlers } from "./reservations/make.handlers";
import { updateHandlers } from "./reservations/update.handlers";
import { cancellHandlers } from "./reservations/cancel.handlers";

/**
 *
 * @description deterministic chat flow, here core business logic lives
 */
class StateRouter {
  private handlers: Record<string, StateHandler[]> = {};

  constructor(public readonly ctx: Readonly<AppContext>) {}

  on(event: ReservationStatus, handler: StateHandler): this {
    (this.handlers[event] ??= []).push(handler);
    return this;
  }

  /**
   *
   * @description if run() returns void, it means no handler was executed.
   * This is OK
   */
  async run(): Promise<StateResult | void> {
    const status = this.ctx.RESERVATION_CACHE?.status;
    if (!status) return;

    const handlers = this.handlers[status] ?? [];
    for (const h of handlers) {
      const res = await h(this.ctx, status);
      if (res) return res;
    }
  }
}

/**
 *
 * @description no-deterministic chat flow, here we can use ai-agents,
 * no-critical logic lives here.
 */
async function conversationalHandler(ctx: AppContext): Promise<string> {
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
          content: systemMessages.initialGreeting(
            customerMessage,
            customer?.name,
          ),
        },
      ];
      const assistantResponse = aiClient(
        messages,
        howSystemWorksPrompt(business),
      );
      return assistantResponse;
    }
    if (customerMessage == FlowOptions.MAKE_RESERVATION) {
      // choice 2
      await reservationCacheService.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: reservationStatuses.MAKE_STARTED,
      });
      const responseMsg = systemMessages.getStartMsg({
        userName: customer?.name,
      });
      return humanizerAgent(responseMsg);
    }
    if (customerMessage == FlowOptions.UPDATE_RESERVATION) {
      // choice 3
      await reservationCacheService.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: reservationStatuses.UPDATE_PRE_START,
      });
      const responseMsg = systemMessages.enterReservationId();
      return humanizerAgent(responseMsg);
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
  const customerIntent = await customerIntentClassifier(customerMessage);

  // 3. AI EXPLANATION OF HOW THE SYSTEM WORKS
  if (customerIntent === CUSTOMER_INTENT.HOW) {
    // choice 4 again
    const assistantResponse = aiClient(
      messages,
      howSystemWorksPrompt(business, RESERVATION_CACHE?.status),
    );
    return assistantResponse;
  }

  // 4. DEFAULT FALLBACK WITH AI AGENT WHEN CUSTOMER ASKS THE WHAT OF SOMETHING
  const result = await infoReservationAgent(
    {
      messages,
      business,
      customerPhone,
    },
    RESERVATION_CACHE?.status,
  );
  const assistantResponse = renderAssistantText(result);
  return assistantResponse;
}

/**
 *
 * @description Initialize the chat flow
 * @param ctx
 * @returns Promise<string>
 */
export async function runChatSession(ctx: AppContext): Promise<string> {
  const stateRouter = new StateRouter(ctx);

  stateRouter
    .on("MAKE_STARTED", makeHandlers.started)
    .on("MAKE_VALIDATED", makeHandlers.validated)
    .on("UPDATE_PRE_START", updateHandlers.preStart)
    .on("UPDATE_STARTED", updateHandlers.started)
    .on("UPDATE_VALIDATED", updateHandlers.validated)
    .on("CANCEL_STARTED", cancellHandlers.started);

  const stateResult = await stateRouter.run();

  if (stateResult && stateResult !== InputIntent.CUSTOMER_QUESTION) {
    await chatHistoryService.save(
      ctx.chatKey,
      ctx.customerMessage,
      stateResult,
    );
    return stateResult;
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
  const preResult = await conversationalHandler(ctx);
  await chatHistoryService.save(ctx.chatKey, ctx.customerMessage, preResult);
  return preResult;
}
