import {
  AGENT_NAME,
  buildWelcomeMessage,
  FlowChoices,
  buildReservationStartMessage,
  ReserveStatus,
  reserveSchema,
  parseStringReservation,
  FlowActions,
  buildReservationPreFinalStep,
  buildReservationReStartMessage,
  EXIT_MESSAGE,
} from "@/agents/prompts";
import { infoReservationAgent } from "@/ai-agents/agent.config";
import { renderAssistantText } from "@/ai-agents/tools/helpers";
import { buildRestaurantInfo } from "@/ai-agents/tools/prompts";
import businessService from "@/services/business.service";
import chatHistoryService from "@/services/chatHistory.service";
import reservationService from "@/services/reservation.service";
import { WahaRecievedEvent } from "@/types/whatsapp/received-event";
import { ModelMessage } from "ai";
import { Handler } from "hono/types";
import { safeParse } from "zod/mini";

export const aiAgentTestHandler: Handler = async (c) => {
  // const session = custumerMessage.session; // use CMS businessID on creation for WAHA
  const custumerRecievedEvent = await c.req.json<WahaRecievedEvent>();
  const businessId = custumerRecievedEvent.metadata?.businessId;
  const customerMessage = (custumerRecievedEvent.payload.body || "").trim();
  const customerPhone = custumerRecievedEvent.payload.from;
  const business = await businessService.getBusinessById(businessId);
  const customer = await businessService.getCostumerByPhone({
    "where[business][equals]": businessId,
    "where[phoneNumber][like]": customerPhone,
  });
  const chatKey = `chat:${businessId}:${customerPhone}`;
  const reservationKey = `reservation:${businessId}:${customerPhone}`;
  const currentReservation = await reservationService.get(reservationKey);
  const chatHistory = await chatHistoryService.get(chatKey);
  const messages: ModelMessage[] = [
    ...chatHistory, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
    {
      role: "user",
      content: customerMessage,
    },
  ];

  if (!customerMessage) {
    return c.json({ error: "Customer message not received" }, 400);
  }
  if (!businessId) {
    return c.json({ error: "Business ID not received" }, 400);
  }
  if (!customerPhone) {
    return c.json({ error: "Customer phone not received" }, 400);
  }

  if (!currentReservation && customerMessage == FlowChoices.MAKE_RESERVATION) {
    // START
    const assistantResponse = buildReservationStartMessage({
      userName: customer?.name,
    });
    await reservationService.save(reservationKey, {
      businessId,
      customerId: customer?.id,
      customerName: customer?.name,
      customerPhone,
      status: ReserveStatus.STARTED,
    });
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return c.json({
      received: true,
      text: assistantResponse,
    });
  }
  if (
    currentReservation?.status === ReserveStatus.VALIDATED &&
    customerMessage.toUpperCase() === FlowActions.RESTART
  ) {
    // RESTART
    const assistantResponse = buildReservationReStartMessage({
      userName: customer?.name,
    });
    await reservationService.save(reservationKey, {
      businessId,
      customerId: customer?.id,
      customerName: customer?.name,
      customerPhone,
      status: ReserveStatus.STARTED,
    });
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return c.json({
      received: true,
      text: assistantResponse,
    });
  }

  // TODO: implement a retry system,
  // if user fails to provide valid input > 2, send a message asking for help
  // otherwise the user will be a loop
  if (currentReservation?.status === ReserveStatus.STARTED) {
    const parseInput = parseStringReservation(customerMessage);
    if (!parseInput.success) {
      return c.json({
        received: true,
        text: parseInput.error,
      });
    }
    const { success, data, error } = safeParse(reserveSchema, parseInput.data);
    if (!success) {
      return c.json({
        received: true,
        text: error,
      });
    }
    await reservationService.save(reservationKey, {
      ...currentReservation,
      day: data.day,
      startTime: data.startTime,
      numberOfPeople: data.numberOfPeople,
      status: ReserveStatus.VALIDATED,
    });

    return c.json({
      received: true,
      text: buildReservationPreFinalStep(data),
    });
  }
  if (
    currentReservation?.status === ReserveStatus.VALIDATED &&
    customerMessage === FlowActions.CONFIRM
  ) {
  }
  if (
    currentReservation?.status === ReserveStatus.VALIDATED &&
    customerMessage === FlowActions.EXIT
  ) {
    await reservationService.delete(reservationKey);
    await chatHistoryService.save(chatKey, customerMessage, EXIT_MESSAGE);

    return c.json({
      received: true,
      text: EXIT_MESSAGE,
    });
  }

  const isFirstMessage = chatHistory.length === 0;

  if (isFirstMessage || customerMessage == FlowChoices.HOW_SYSTEM_WORKS) {
    // choices 0 & 4
    const assistantResponse = buildWelcomeMessage({
      assistantName: AGENT_NAME,
      restaurantName: business.name,
      userName: customer?.name,
    });
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return c.json({
      received: true,
      text: assistantResponse,
    });
  }
  if (customerMessage == FlowChoices.GENERAL_INFO) {
    // choice 1
    const assistantResponse = buildRestaurantInfo(business);
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return c.json({
      received: true,
      text: assistantResponse,
    });
  }

  const result = await infoReservationAgent({
    messages,
    business,
    customerPhone,
  });
  const assistantResponse = renderAssistantText(result);
  await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
  return c.json({
    received: true,
    text: assistantResponse,
    messages,
    result,
  });
};
