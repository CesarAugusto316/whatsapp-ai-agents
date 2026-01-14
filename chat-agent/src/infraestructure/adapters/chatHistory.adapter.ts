import { redisClient } from "../cache/redis.client";
import { ModelMessage } from "../http/ai/llm.types";

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
const EXPIRATION_TIME = 60 * 60 * 2; // 2 horas

class ChatHistory {
  /**
   * @example
   * KEYS chat:*
   * LRANGE chatKey 0 -1
   * @description
   * @param chatKey chat:businesID:customerPhone
   * @returns
   */
  async get(chatKey: string) {
    const rawHistory =
      (await redisClient.lrange(chatKey, -MAX_MESSAGES, -1)) ?? [];
    return rawHistory.map((item) => {
      const msg: StoredMessage = JSON.parse(item);
      return {
        role: msg.role,
        content: msg.content,
      };
    }) satisfies ModelMessage[];
    // .filter((msg) => msg.role === "user");
  }

  /**
   *
   * @param chatKey
   * @param customerMessage
   * @param assistantResponse
   */
  async push(
    chatKey: string,
    customerMessage: string,
    assistantResponse: string,
  ) {
    await redisClient.rpush(
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
    await redisClient.ltrim(chatKey, -MAX_MESSAGES, -1);
    await redisClient.expire(chatKey, EXPIRATION_TIME);
  }
}

export default new ChatHistory();
