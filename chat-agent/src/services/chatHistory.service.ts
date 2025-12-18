import { redis } from "@/storage/storage.config";
import { ModelMessage } from "ai";

// COMMANDS REDDIS
// KEYS chat:*
//         1) "chat:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:+3455555555"
// LRANGE chat:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:+3455555555 0 -1
type StoredMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
};
const MAX_MESSAGES = 20;
const EXPIRATION_TIME = 60 * 60 * 3; // 3 horas

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
    return rawHistory.map((item) => {
      const msg: StoredMessage = JSON.parse(item);
      return {
        role: msg.role,
        // role: msg.role == "assistant" ? "system" : "user",
        content: msg.content,
      };
    }) satisfies ModelMessage[];
    // TODO: TRY WITH system INSTEAD OF assistant
    // .filter((message) => message.role === "user") satisfies ModelMessage[]
  }

  /**
   *
   * @param chatKey
   * @param customerMessage
   * @param assistantResponse
   */
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
        role: "assistant", // TODO: try with "system"
        content: assistantResponse,
        timestamp: Date.now(),
      } satisfies StoredMessage),
    );
    await redis.ltrim(chatKey, -MAX_MESSAGES, -1);
    await redis.expire(chatKey, EXPIRATION_TIME);
  }
}

export default new ChatHistoryService();
