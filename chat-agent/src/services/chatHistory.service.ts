import { redis } from "@/ai-agents/config";
import { ModelMessage } from "ai";

// COMMANDS REDDIS
// KEYS chat:*
//         1) "chat:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:+3455555555"
// LRANGE chat:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:+3455555555 0 -1
type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};
const MAX_MESSAGES = 20;

class ChatHistoryService {
  /**
   * @example
   * KEYS chat:*
   * LRANGE chatKey 0 -1
   * @description
   * @param chatKey chat:businesID:customerPhone
   * @returns
   */
  async get(chatKey: string) {
    const rawHistory = (await redis.lrange(chatKey, -MAX_MESSAGES, -1)) ?? [];
    return rawHistory
      .map((item) => {
        const msg: StoredMessage = JSON.parse(item);
        return {
          role: msg.role,
          content: msg.content,
        };
      })
      .filter((message) => message.role === "user") satisfies ModelMessage[];
  }

  async save(
    chatKey: string,
    customerMessage: string,
    assistantResponse: string,
  ) {
    await redis.rpush(
      chatKey,
      JSON.stringify({
        role: "user",
        content: customerMessage,
        timestamp: Date.now(),
      } satisfies StoredMessage),
      JSON.stringify({
        role: "assistant",
        content: assistantResponse,
        timestamp: Date.now(),
      } satisfies StoredMessage),
    );
    await redis.ltrim(chatKey, -MAX_MESSAGES, -1);
    await redis.expire(chatKey, 60 * 60 * 24);
  }
}

export default new ChatHistoryService();
