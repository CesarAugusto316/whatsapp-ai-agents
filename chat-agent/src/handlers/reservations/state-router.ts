import {
  aiClient,
  customerIntentClassifier,
  humanizerAgent,
  infoReservationAgent,
} from "@/ai-agents/agent.config";
import {
  CUSTOMER_INTENT,
  FlowOptions,
  FMStatus,
  InputIntent,
} from "@/ai-agents/agent.types";
import {
  getStateTransition,
  ReservationState,
} from "@/ai-agents/finite-state-machine/get-state-transition.";
import { StateRouter } from "@/ai-agents/finite-state-machine/state-router";
import {
  howSystemWorksPrompt,
  systemMessages,
} from "@/ai-agents/tools/prompts";
import businessService from "@/services/business.service";
import chatHistoryService from "@/services/chatHistory.service";
import reservationCacheService from "@/services/reservationCache.service";
import { Appointment } from "@/types/business/cms-types";
import { AppContext } from "@/types/hono.types";
import { ModelMessage } from "ai";
import { makeHandlers } from "./make.handlers";
import { updateHandlers } from "./update.handlers";
import { cancellHandlers } from "./cancel.handlers";
import { renderAssistantText } from "@/helpers/helpers";

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
      const transition = getStateTransition(FlowOptions.MAKE_RESERVATION);
      await reservationCacheService.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: transition.nextStatus, // MAKE_STARTED
      });
      const responseMsg = systemMessages.getCreateMsg({
        userName: customer?.name,
      });
      return humanizerAgent(responseMsg);
    }

    if (customerMessage == FlowOptions.UPDATE_RESERVATION) {
      // choice 3
      if (!customer) {
        return humanizerAgent(
          "Por favor, Crea una reserva para poder actualizarla",
        );
      }
      const lastRes = await businessService.getAppointmentsByParams({
        "where[business][equals]": business.id,
        "where[customer][equals]": customer.id,
        "where[status][equals]": "confirmed",
        sort: "-updatedAt", // the last reservation
        limit: 1, // only one reservation
      });

      if (lastRes.status !== 200) {
        return humanizerAgent(
          "Ocurrió un error al buscar la reserva, intenta de nuevo",
        );
      }
      const reservation = (
        (await lastRes.json()) as { docs: Appointment[] }
      ).docs.at(0);

      if (!reservation) {
        return humanizerAgent(
          "Reserva no encontrada. Seguro que ya has creado una reserva?",
        );
      }
      console.log({ reservation });
      const transition = getStateTransition(FlowOptions.UPDATE_RESERVATION);
      const previousState = {
        id: reservation.id,
        customerName: reservation.customerName || customer?.name || "",
        startDateTime: reservation.startDateTime || "",
        endDateTime: reservation.endDateTime,
        numberOfPeople: reservation.numberOfPeople || 0,
        businessId: business.id,
        customerId: customer.id,
        customerPhone,
        status: transition.nextStatus, // UPDATE_STARTED
      } satisfies Partial<ReservationState>;

      console.log({ previousState });
      await reservationCacheService.save(reservationKey, previousState);
      const responseMsg = systemMessages.getUpdateMsg(previousState);
      return humanizerAgent(responseMsg);
    }

    if (customerMessage == FlowOptions.CANCEL_RESERVATION) {
      // choice 3
      if (!customer) {
        return humanizerAgent(
          "Por favor, Crea una reserva para poder actualizarla",
        );
      }
      const lastRes = await businessService.getAppointmentsByParams({
        "where[business][equals]": business.id,
        "where[customer][equals]": customer.id,
        "where[status][equals]": "confirmed",
        sort: "-updatedAt", // the last reservation
        limit: 1, // only one reservation
      });

      if (lastRes.status !== 200) {
        return humanizerAgent(
          "Ocurrió un error al buscar la reserva, intenta de nuevo",
        );
      }
      const reservation = (
        (await lastRes.json()) as { docs: Appointment[] }
      ).docs.at(0);

      if (!reservation) {
        return humanizerAgent(
          "Reserva no encontrada. Seguro que ya has creado una reserva?",
        );
      }
      console.log({ reservation });
      const transition = getStateTransition(FlowOptions.CANCEL_RESERVATION);
      const previousState = {
        id: reservation.id,
        customerName: reservation.customerName || customer?.name || "",
        startDateTime: reservation.startDateTime || "",
        endDateTime: reservation.endDateTime,
        numberOfPeople: reservation.numberOfPeople || 0,
        businessId: business.id,
        customerId: customer.id,
        customerPhone,
        status: transition.nextStatus, // CANCEL_STARTED
      } satisfies Partial<ReservationState>;

      console.log({ previousState });
      await reservationCacheService.save(reservationKey, previousState);
      const responseMsg = systemMessages.getCancelMsg(previousState);
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
  const stateRouter = new StateRouter<AppContext, FMStatus>(
    ctx,
    ctx.RESERVATION_CACHE?.status,
  );

  stateRouter
    .on("MAKE_STARTED", makeHandlers.started)
    .on("MAKE_VALIDATED", makeHandlers.validated)
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
  const convResult = await conversationalHandler(ctx);
  await chatHistoryService.save(ctx.chatKey, ctx.customerMessage, convResult);
  return convResult;
}
