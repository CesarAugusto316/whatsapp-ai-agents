import { EmbeddingItem, EmbeddingRequest } from "./embeddings.types";
import {
  ChatMessage,
  MessagesBasedRequest,
  ToolCall,
} from "./open-ai-compatible.types";

export interface GenerateTextResult {
  content: string;
  toolCalls?: ToolCall[];
}

export type HandleMessageSendArgs = {
  readonly systemPrompt: string;
  readonly msg: string;
  readonly chatHistory?: ChatMessage[];
  readonly useAuxModel?: boolean;
};

export interface IAiAdapter {
  generateText(args: MessagesBasedRequest): Promise<string>;

  /**
   * Generate text with tool calling support
   * @param args - Request with messages and optional tools
   * @param maxIterations - Maximum number of tool call iterations (default: 3)
   * @returns Result with final content and any tool calls made
   */
  generateTextWithTools(
    args: MessagesBasedRequest,
    maxIterations?: number,
  ): Promise<GenerateTextResult>;

  handleChatMessage(args: HandleMessageSendArgs): Promise<string>;

  /**
   * @link https://platform.openai.com/docs/api-reference/embeddings
   * @param payload
   * @returns
   */
  embedding(payload: EmbeddingRequest): Promise<EmbeddingItem[]>;
}
