import { infoReservationAgent } from "@/ai-agents/agent.config";
import { renderAssistantText } from "@/ai-agents/tools/helpers";
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
  const business = await businessService.getBusinessById(businessId);

  // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
  const messages: ModelMessage[] = [
    ...chatHistory,
    {
      role: "user",
      content: customerMessage,
    },
  ];
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
