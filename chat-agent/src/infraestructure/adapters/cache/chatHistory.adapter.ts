import { redisClient } from "./redis.client";
import type { ChatMessage } from "../ai";
import { env } from "bun";
import { logger } from "@/infraestructure/logging";

type StoredMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  name?: string;
  tool_call_id?: string;
};

// COMMANDS REDDIS
// KEYS chat:*  -> "chat:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:+3455555555"
// LRANGE chat:71358eb4-b61e-418d-a2fe-e34b8e5c5e6c:+3455555555 0 -1
class ChatHistory {
  private hours = env.NODE_ENV === "production" ? 24 : 0.5;
  private readonly MAX_MESSAGES = 8;
  private readonly EXPIRATION_TIME = 60 * 60 * this.hours; // 24 horas

  /**
   * @example
   * KEYS chat:*
   * LRANGE chatKey 0 -1
   * @description
   * @param chatKey chat:businesID:customerPhone
   * @returns ChatMessage[] - ONLY user/assistant messages (NO system prompts)
   */
  async get(chatKey: string) {
    const rawHistory =
      (await redisClient.lrange(chatKey, -this.MAX_MESSAGES, -1)) ?? [];

    const messages = rawHistory
      .map((item) => {
        const msg: StoredMessage = JSON.parse(item);
        return {
          role: msg.role,
          content: msg.content,
          name: msg.name,
          tool_call_id: msg.tool_call_id,
        } satisfies ChatMessage;
      })
      .filter((msg) => msg.role !== "system"); // ← CRITICAL: Never persist system prompts

    // Log context size for monitoring token usage
    if (env.NODE_ENV === "production") {
      logger.info("CHAT_HISTORY_RETRIEVED", {
        chatKey,
        messageCount: messages.length,
        maxMessages: this.MAX_MESSAGES,
        timestamp: Date.now(),
      });
    }

    return messages satisfies ChatMessage[];
  }

  /**
   * Pushes ONLY user/assistant messages to chat history.
   * System prompts are NEVER persisted - they're transient per-iteration instructions.
   *
   * @param chatKey chat:businessID:customerPhone
   * @param customerMessage - user message content
   * @param assistantResponse - assistant message content
   */
  async push(
    chatKey: string,
    customerMessage: string,
    assistantResponse: string,
    toolCalls?: ChatMessage[],
  ) {
    //
    const toolMessages = toolCalls
      ? toolCalls.map((call) => JSON.stringify({ call, timestamp: Date.now() }))
      : undefined;

    // Validate: Never store system prompts
    if (toolMessages?.length) {
      await redisClient.rpush(
        chatKey,
        JSON.stringify({
          role: "user",
          content: customerMessage,
          timestamp: Date.now(),
        } satisfies StoredMessage),

        ...toolMessages,

        JSON.stringify({
          role: "assistant",
          content: assistantResponse,
          timestamp: Date.now(),
        } satisfies StoredMessage),
      );
    } //
    else {
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
    }
    await redisClient.ltrim(chatKey, -this.MAX_MESSAGES, -1);
    await redisClient.expire(chatKey, this.EXPIRATION_TIME);

    // Log for monitoring
    if (env.NODE_ENV === "production") {
      logger.info("CHAT_HISTORY_UPDATED", {
        chatKey,
        operation: "push",
        maxMessages: this.MAX_MESSAGES,
        expirationHours: this.hours,
        timestamp: Date.now(),
      });
    }
  }
}

export default new ChatHistory();
