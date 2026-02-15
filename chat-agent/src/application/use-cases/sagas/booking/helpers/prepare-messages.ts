import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";

type Args = {
  readonly systemPrompt: string;
  readonly msg: string;
  readonly chatHistory?: ChatMessage[];
  readonly useAuxModel?: boolean;
};

const defaultConfig: Args = {
  chatHistory: [],
  msg: "",
  useAuxModel: false,
  systemPrompt: "",
};

/**
 *
 * @param promptGen
 * @param customerMessage
 * @param chatHistory
 * @returns
 */
export async function handleMessageProcessing({
  systemPrompt,
  msg,
  chatHistory = [],
  useAuxModel = false,
}: Args = defaultConfig) {
  //
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: msg },
  ];

  return await aiAdapter.generateText({
    messages,
    useAuxModel,
  });
}
