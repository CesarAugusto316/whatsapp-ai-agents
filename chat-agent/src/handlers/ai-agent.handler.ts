import { aiAgent } from "@/ai-agents/config";
import { buildRestaurantSystemPrompt } from "@/ai-agents/tools/helpers";
import businessService from "@/services/business.service";
import whatsappService from "@/services/whatsapp.service";
import { WahaRecievedEvent } from "@/types/whatsapp/received-event";
import { ModelMessage } from "ai";
import { Handler } from "hono/types";

export const aiAgentTestHandler: Handler = async (c) => {
  const custumerMessage = await c.req.json<WahaRecievedEvent>();
  // const session = custumerMessage.session; // use CMS businessID on creation for WAHA
  const businessId = custumerMessage.metadata?.businessId;

  const business = await businessService.getBusinessById(businessId);
  const system = buildRestaurantSystemPrompt(
    business,
    custumerMessage.payload.from,
  );
  // console.log({ business });
  // console.log({ system });

  // PASSING UI-MESSAGES
  // const msgs = convertToModelMessages([
  //   {
  //     parts: [
  //       {
  //         type: "text",
  //         text: "Hello, how can I help you today?",
  //       },
  //       {
  //         type: "text",
  //         text: "Hello, how can I help you today?",
  //       },
  //     ],
  //     role: "user",
  //   },
  // ]);

  // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
  const messages: ModelMessage[] = [
    // ...chatHistory,
    {
      role: "user",
      content: custumerMessage.payload.body,
    },
  ];

  // PODEMOS LLAMAR A LA API DE CMS ANTES DEL AGENTE Y ASI TENER MAS CONTEXTO
  // const result = undefined;
  const result = await aiAgent.generate({
    system: system,
    // messages: [
    //   {
    //     role: "user",
    //     content: custumerMessage.payload.body,
    //   },
    //   {
    //     role: "assistant",
    //     content: "Sure, I can help you with that!",
    //   },
    // ],
    prompt: custumerMessage.payload.body,
    // messages
  });
  // result
  return c.json({ received: true, result });
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
