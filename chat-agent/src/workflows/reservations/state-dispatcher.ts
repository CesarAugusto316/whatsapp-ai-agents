import {
  aiClient,
  customerIntentClassifier,
  humanizerAgent,
  infoReservationAgent,
} from "@/llm/llm.config";
import {
  CUSTOMER_INTENT,
  FlowOptions,
  FMStatus,
  InputIntent,
} from "@/types/reservation/reservation.types";
import {
  ReservationState,
  resolveNextState,
} from "@/workflow-fsm/resolve-next-state";
import businessService from "@/services/business.service";
import chatHistoryService from "@/services/chatHistory.service";
import reservationCacheService from "@/services/reservationCache.service";
import { Appointment } from "@/types/business/cms-types";
import { AppContext } from "@/types/hono.types";
import { ModelMessage } from "ai";
import { makeWorflow } from "./make.workflow";
import { updateWorkflow } from "./update.workflow";
import { cancellWorkflow } from "./cancel.workflow";
import { renderAssistantText } from "@/helpers/helpers";
import { StateWorkflowRunner } from "@/workflow-fsm/state-dispatcher";
import { howSystemWorksPrompt, systemMessages } from "@/llm/prompts";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 */
async function resolveConversationalFallback(ctx: AppContext): Promise<string> {
  const {
    RESERVATION_CACHE,
    customerMessage = "",
    customerPhone = "",
    reservationKey = "",
    customer,
    business,
    chatKey = "",
  } = ctx;

  // 1. FLOW SELECTION & INITIALIZATION (pre-FSM, no authoritative)
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
      const transition = resolveNextState(FlowOptions.MAKE_RESERVATION);
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
      const transition = resolveNextState(FlowOptions.UPDATE_RESERVATION);
      const previousState = {
        id: reservation.id,
        customerName: reservation.customerName || customer.name || "",
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
      const transition = resolveNextState(FlowOptions.CANCEL_RESERVATION);
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
export async function runReservationWorkflow(ctx: AppContext): Promise<string> {
  const dispatcher = new StateWorkflowRunner<AppContext, FMStatus>(
    ctx,
    ctx.RESERVATION_CACHE?.status,
  );

  dispatcher
    .on("MAKE_STARTED", makeWorflow.started)
    .on("MAKE_VALIDATED", makeWorflow.validated)
    .on("UPDATE_STARTED", updateWorkflow.started)
    .on("UPDATE_VALIDATED", updateWorkflow.validated)
    .on("CANCEL_STARTED", cancellWorkflow.started);

  const stateResult = await dispatcher.run();

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
  const fallback: string = await resolveConversationalFallback(ctx);
  await chatHistoryService.save(ctx.chatKey, ctx.customerMessage, fallback);
  return fallback;
}
