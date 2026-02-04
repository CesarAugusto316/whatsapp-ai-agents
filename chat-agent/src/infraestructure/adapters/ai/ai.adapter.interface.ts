import { EmbeddingItem, EmbeddingRequest } from "./embeddings.types";
import { MessagesBasedRequest } from "./open-ai-compatible.types";

export interface IAiAdapter {
  userMsg(args: MessagesBasedRequest, prompt: string): Promise<string>;

  systemMsg(message: string, temperature?: number): Promise<string>;

  /**
   * @link https://platform.openai.com/docs/api-reference/embeddings
   * @param payload
   * @returns
   */
  embedding(payload: EmbeddingRequest): Promise<EmbeddingItem[]>;
}
