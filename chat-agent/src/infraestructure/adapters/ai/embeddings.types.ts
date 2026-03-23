export type OneOrMany<T> = T | T[];

export interface EmbeddingRequest {
  encoding_format?: "float" | "base64";
  model?: string;

  dimensions?: number;
  input?: OneOrMany<string>;
}

export interface EmbeddingResponse {
  object: "list";
  data: EmbeddingItem[];
  model: string;
  usage: EmbeddingUsage;
}

export interface EmbeddingItem {
  object: "embedding";
  embedding: number[];
  index: number;
}

export interface EmbeddingUsage {
  prompt_tokens: number;
  total_tokens: number;
}
