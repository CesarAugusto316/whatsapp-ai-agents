import { aiAgent } from "@/ai-agents/config";
import businessService from "@/services/business.service";
import whatsappService from "@/services/whatsapp.service";
import { WahaRecievedEvent } from "@/types/whatsapp/received-event";
import { ModelMessage } from "ai";
import { Handler } from "hono/types";

export const aiAgentTestHandler: Handler = async (c) => {
  const custumerMessage = await c.req.json<WahaRecievedEvent>();
  const session = custumerMessage.session; // use CMS businessID on creation
  const businessId = custumerMessage.metadata?.businessId;
  const userId = custumerMessage.metadata?.userId;
  // const ownerId = c.req.param("ownerId"); // use CMS ownerId/userId on creation

  const business = await businessService.getBusinessById(businessId);

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: custumerMessage.payload.body,
    },
  ];

  // PODEMOS LLAMAR A LA API DE CMS ANTES DEL AGENTE Y ASI TENER MAS CONTEXTO
  const result = undefined;
  //   await aiAgent.generate({
  //   prompt: custumerMessage.payload.body,
  //   // messages
  // });

  return c.json({ received: true, result, business });
};

export const aiAgentHandler: Handler = async (c) => {
  // const businessId = c.req.param("ownerId");
  const custumerMessage = await c.req.json<WahaRecievedEvent>();
  const toPhoneNumber = custumerMessage.payload.from;

  if (custumerMessage.event !== "message") {
    return c.json({ message: "Invalid event" });
  }

  // 1. Set message as seen & call the ai-agent & get AI response
  const aiResponse = await whatsappService.beforeSend(
    {
      session: custumerMessage.session,
      chatId: toPhoneNumber,
    },
    async () => {
      // const result = await generateText({
      //   model: model,
      //   system: "Eres un asistente que hacer reservas en restaurantes",
      //   prompt: custumerMessage.payload.body,
      //   tools: tools,
      // });
      // return result.text;
      return "AI response";
    },
  );

  // 2. Send AI response to customer
  await whatsappService.sendText({
    chatId: toPhoneNumber,
    text: aiResponse,
    session: custumerMessage.session,
  });
  return c.json({ received: true, message: "AI Agent Response" });
};
