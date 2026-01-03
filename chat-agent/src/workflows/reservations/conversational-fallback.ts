import { renderAssistantText } from "@/helpers/helpers";
import {
  aiClient,
  customerIntentClassifier,
  humanizerAgent,
  infoReservationAgent,
} from "@/llm/llm.config";
import { howSystemWorksPrompt } from "@/llm/prompts/conversational-prompts";
import { systemMessages } from "@/llm/prompts/system-messages";
import businessService from "@/services/business.service";
import chatHistoryService from "@/services/chatHistory.service";
import reservationCacheService from "@/services/reservationCache.service";
import { Appointment } from "@/types/business/cms-types";
import { AppContext } from "@/types/hono.types";
import {
  CUSTOMER_INTENT,
  FlowOptions,
  ReservationState,
} from "@/types/reservation/reservation.types";
import { resolveNextState } from "@/workflow-fsm/resolve-next-state";
import { ModelMessage } from "ai";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 */
export async function resolveConversationalFallback(
  ctx: AppContext,
): Promise<string> {
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
        status: transition.nextState, // MAKE_STARTED
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
      // reservation.startDateTime -> to UTC localDatime
      console.log({ reservation });
      const transition = resolveNextState(FlowOptions.UPDATE_RESERVATION);
      const previousState = {
        id: reservation.id,
        customerName: reservation.customerName || customer.name || "",
        // startDateTime: reservation.startDateTime || "",
        // endDateTime: reservation.endDateTime,
        // datetime reservation.
        numberOfPeople: reservation.numberOfPeople || 0,
        businessId: business.id,
        customerId: customer.id,
        status: transition.nextState, // UPDATE_STARTED
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
        // startDateTime: reservation.startDateTime || "",
        // endDateTime: reservation.endDateTime,
        numberOfPeople: reservation.numberOfPeople || 0,
        businessId: business.id,
        customerId: customer.id,
        // customerPhone,
        status: transition.nextState, // CANCEL_STARTED
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
