import { redisClient } from "./redis.client";
import type { ChatMessage } from "../ai";
import { env } from "bun";

type StoredMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
};

// COMMANDS REDDIS
// KEYS chat:*  -> "chat:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:+3455555555"
// LRANGE chat:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:+3455555555 0 -1
class ChatHistory {
  private hours = env.NODE_ENV === "production" ? 24 : 0.5;
  private readonly MAX_MESSAGES = 20;
  private readonly EXPIRATION_TIME = 60 * 60 * this.hours; // 24 horas

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
      (await redisClient.lrange(chatKey, -this.MAX_MESSAGES, -1)) ?? [];
    return rawHistory.map((item) => {
      const msg: StoredMessage = JSON.parse(item);
      return {
        role: msg.role,
        content: msg.content,
      };
    }) satisfies ChatMessage[];
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
    await redisClient.ltrim(chatKey, -this.MAX_MESSAGES, -1);
    await redisClient.expire(chatKey, this.EXPIRATION_TIME);
  }
}

export default new ChatHistory();
