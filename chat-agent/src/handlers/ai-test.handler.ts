import { classifyCustomerIntent } from "@/agents/config";
import {
  AGENT_NAME,
  buildWelcomeMessage,
  CUSTOMER_INTENT,
  FlowChoices,
} from "@/agents/prompts";
import { infoReservationAgent } from "@/ai-agents/agent.config";
import { renderAssistantText } from "@/ai-agents/tools/helpers";
import { buildRestaurantInfo } from "@/ai-agents/tools/prompts";
import businessService from "@/services/business.service";
import chatHistoryService from "@/services/chatHistory.service";
import { WahaRecievedEvent } from "@/types/whatsapp/received-event";
import { ModelMessage } from "ai";
import { Handler } from "hono/types";

export const aiAgentTestHandler: Handler = async (c) => {
  // const session = custumerMessage.session; // use CMS businessID on creation for WAHA
  const custumerRecievedEvent = await c.req.json<WahaRecievedEvent>();
  const businessId = custumerRecievedEvent.metadata?.businessId;
  const customerMessage = custumerRecievedEvent.payload.body;
  const customerPhone = custumerRecievedEvent.payload.from;

  if (!customerMessage) {
    return c.json({ error: "Customer message not received" }, 400);
  }
  if (!businessId) {
    return c.json({ error: "Business ID not received" }, 400);
  }
  if (!customerPhone) {
    return c.json({ error: "Customer phone not received" }, 400);
  }
  const chatKey = `chat:${businessId}:${customerPhone}`;
  const chatHistory: ModelMessage[] = await chatHistoryService.get(chatKey);
  const messages: ModelMessage[] = [
    ...chatHistory, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
    {
      role: "user",
      content: customerMessage,
    },
  ];
  const business = await businessService.getBusinessById(businessId);
  const customer = await businessService.getCostumerByPhone({
    "where[business][equals]": businessId,
    "where[phoneNumber][like]": customerPhone,
  });
  const isFirstMessage = chatHistory.length === 0;

  if (isFirstMessage) {
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
  if (customerMessage == FlowChoices.HOW_SYSTEM_WORKS) {
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
    const assistantResponse = buildRestaurantInfo(business);
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return c.json({
      received: true,
      text: assistantResponse,
    });
  }
  const customerIntent = await classifyCustomerIntent(messages);
  if (
    customerIntent === CUSTOMER_INTENT.INFO_RESERVATION ||
    customerIntent === CUSTOMER_INTENT.UNKNOWN
  ) {
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
  }
};
