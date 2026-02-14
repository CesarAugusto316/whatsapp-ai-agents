import { RestaurantCtx } from "@/domain/restaurant";
import { systemMessages } from "@/domain/restaurant/booking/prompts";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";

interface PrepareMessages {
  readonly ctx: {
    chatHistory: ChatMessage[];
    customer: { name?: string; msg: string };
  };
  readonly systemPrompt: string;
}

/**
 *
 * @param ctx
 * @param policy
 * @returns
 */
function prepareMessages({
  ctx,
  systemPrompt,
}: PrepareMessages): ChatMessage[] {
  //
  const { chatHistory, customer } = ctx;
  const isFirstMessage = chatHistory.length === 0;

  if (isFirstMessage) {
    return [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: systemMessages.initialGreeting(customer.msg, customer?.name),
      },
    ];
  }

  return [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: customer.msg },
  ];
}

export async function handleMessageProcessing(
  promptGen: () => string,
  ctx: RestaurantCtx,
) {
  const { chatKey, customerMessage, customer } = ctx;

  const chatHistory = await chatHistoryAdapter.get(chatKey);

  const messages = prepareMessages({
    ctx: {
      chatHistory,
      customer: { name: customer?.name, msg: customerMessage },
    },
    systemPrompt: promptGen(),
  });

  const assistant = await aiAdapter.generateText({
    messages,
  });
  await chatHistoryAdapter.push(chatKey, customerMessage, assistant);
  return assistant;
}
