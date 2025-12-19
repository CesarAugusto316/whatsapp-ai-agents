import {
  infoReservationAgent,
  makeReservationsAgent,
  routerAgent,
} from "@/ai-agents/ai-gent.config";
import {
  buildCustomerServiceSystemPrompt,
  buildReservationSystemPrompt,
  renderAssistantText,
} from "@/ai-agents/tools/helpers";
import businessService from "@/services/business.service";
import chatHistoryService from "@/services/chatHistory.service";
import { WahaRecievedEvent } from "@/types/whatsapp/received-event";
import { ModelMessage } from "ai";
import { Handler } from "hono/types";

const builder = {
  infoReservation: {
    agent: infoReservationAgent,
    prompt: buildCustomerServiceSystemPrompt,
  },
  makeReservation: {
    agent: makeReservationsAgent,
    prompt: buildReservationSystemPrompt,
  },
  updateReservation: {
    agent: undefined,
    prompt: undefined,
  },
  cancelReservation: {
    agent: undefined,
    prompt: undefined,
  },
};

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
  const customer = await businessService.getCostumerByPhone({
    "where[phoneNumber][like]": customerPhone,
    "where[business][equals]": businessId,
    limit: 1,
    depth: 0,
  });

  // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
  const messages: ModelMessage[] = [
    ...chatHistory,
    {
      role: "user",
      content: customerMessage.trim(),
      // ? [
      //     {
      //       text: `Mi nombre es ${customer?.name}`,
      //       type: "text",
      //     },
      //     {
      //       text: customerMessage.trim(),
      //       type: "text",
      //     },
      //   ]
      // : [
      //     {
      //       text: customerMessage.trim(),
      //       type: "text",
      //     },
      //   ],
    },
  ];

  const text = await routerAgent(messages);
  console.log({ text });
  if (!text) {
    return c.json({ error: "Action type not received" }, 400);
  }
  const ai = builder[text];

  const result = await ai.agent?.generate({
    system: ai.prompt(business, customerPhone),
    prompt: messages,
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
