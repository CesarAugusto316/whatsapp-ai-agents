export type OneOrMany<T> = T | T[];

export interface EmbeddingRequest {
  /**
   * Query or queries to embed
   */
  queries?: OneOrMany<string>;

  /**
   * Optional task instruction
   * Default:
   * "Given a web search query, retrieve relevant passages that answer the query"
   */
  instruction?: string;

  /**
   * Document(s) to embed
   */
  documents?: OneOrMany<string>;

  /**
   * Alias for documents
   */
  text?: OneOrMany<string>;
}

export interface EmbeddingResponse {
  /**
   * Embedding vectors
   * Each item is a float array
   */
  data: number[][];

  /**
   * Shape of the tensor, e.g [N, D]
   */
  shape?: number[];
}
