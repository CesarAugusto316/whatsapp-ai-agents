import aiAdapter from "./ai.adapter";
export { aiAdapter };
export type { IAiAdapter, GenerateTextResult } from "./ai.adapter.interface";
export type {
  ChatCompletionChoice,
  ChatCompletionChunk,
  ChatCompletionResponse,
  ChatCompletionResponseMessage,
  ChatMessage,
  ChatRequest,
  FunctionDefinition,
  FunctionParameters,
  JSONSchema,
  MessagesBasedRequest,
  ResponseFormat,
  ToolCall,
  ToolDefinition,
} from "./open-ai-compatible.types";
export {
  isLegacyToolDefinition,
  isPromptBasedRequest,
  isToolFunction,
  isMessagesBasedRequest,
} from "./open-ai-compatible.types";
export { handleProductOrderWithTools } from "./tool-executor";
