import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";

/**
 *
 * @param promptGen
 * @param customerMessage
 * @param chatHistory
 * @returns
 */
export async function handleMessageProcessing(
  promptGen: () => string,
  customerMessage: string,
  chatHistory: ChatMessage[] = [],
  useAuxModel: boolean = false,
) {
  //
  const messages: ChatMessage[] = [
    { role: "system", content: promptGen() },
    ...chatHistory,
    { role: "user", content: customerMessage },
  ];

  return await aiAdapter.generateText({
    messages,
    useAuxModel,
  });
}
