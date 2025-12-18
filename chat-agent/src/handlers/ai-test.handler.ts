import { aiAgent } from "@/ai-agents/ai-gent.config";
import { buildRestaurantSystemPrompt } from "@/ai-agents/tools/helpers";
import businessService from "@/services/business.service";
import chatHistoryService from "@/services/chatHistory.service";
import { WahaRecievedEvent } from "@/types/whatsapp/received-event";
import { GenerateTextResult, ModelMessage, ToolSet } from "ai";
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
  const customer = await businessService.getCostumerByPhone({
    "where[phoneNumber][like]": customerPhone,
    "where[business][equals]": businessId,
    limit: 1,
    depth: 0,
  });

  // ADD CUSOMER CONTEXT TO THE SYSTEM PROMPT, IF CUSTUMER IS NOT FOUND, SHOULD BE CREATED
  // BEFORE APPOINTMENT CREATION
  const system = buildRestaurantSystemPrompt(business, customerPhone, customer);

  // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
  const messages: ModelMessage[] = [
    ...chatHistory,
    {
      role: "user",
      content: customer
        ? [
            {
              text: `Mi nombre es ${customer?.name}`,
              type: "text",
            },
            {
              text: customerMessage,
              type: "text",
            },
          ]
        : customerMessage,
    },
  ];

  const result = await aiAgent.generate({
    system,
    prompt: messages,
  });
  const assistantResponse: string = renderAssistantText(result);
  await chatHistoryService.save(chatKey, customerMessage, assistantResponse);

  return c.json({ received: true, text: assistantResponse, messages, result });
};

// const  w = await generateText({})
function renderAssistantText<T>(result: T): string {
  return (result as GenerateTextResult<ToolSet, unknown>).steps
    .flatMap((step) => step.content ?? [])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}
