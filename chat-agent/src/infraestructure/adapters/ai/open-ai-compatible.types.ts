// Interfaces principales para la API de chat completions con function calling

export interface JSONSchema {
  type: string;
  description?: string;
  enum?: string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  additionalProperties?: boolean | JSONSchema;
  minimum?: number;
  maximum?: number;
  default?: number | string;
  minLength?: number;
  maxLength?: number;
  format?: string;
  pattern?: string;
}

export interface FunctionParameters {
  type: "object";
  properties: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: FunctionParameters;
}

export interface ToolFunction {
  type: "function";
  function: FunctionDefinition;
}

export interface LegacyToolDefinition {
  name: string;
  description: string;
  parameters: FunctionParameters;
}

export type ToolDefinition = ToolFunction | LegacyToolDefinition;

export interface ResponseFormat {
  type: "json_object" | "json_schema";
  json_schema?: JSONSchema;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolCall {
  id?: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionResponseMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
}

// Interfaces para las dos variantes de entrada (prompt y messages)
export interface PromptBasedRequest {
  prompt: string;
  lora?: string;
  response_format?: ResponseFormat;
  raw?: boolean;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  seed?: number;
  repetition_penalty?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface MessagesBasedRequest {
  messages: ChatMessage[];
  functions?: Array<{
    name: string;
    code: string;
  }>;
  enable_thinking?: boolean;
  tools?: ToolDefinition[];
  response_format?: ResponseFormat;
  raw?: boolean;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  seed?: number;
  repetition_penalty?: number;
  frequency_penalty?: number;
  presence_penalty?: number;

  // custom field
  useAuxModel?: boolean;
}

export type ChatRequest = PromptBasedRequest | MessagesBasedRequest;

// Interfaces para la respuesta
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ToolCallResponse {
  arguments: string;
  name: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatCompletionResponseMessage;
  finish_reason:
    | "stop"
    | "length"
    | "tool_calls"
    | "content_filter"
    | "function_call";
}

export interface ChatCompletionResponse {
  response: string;
  usage?: TokenUsage;
  tool_calls?: ToolCallResponse[];
  choices?: ChatCompletionChoice[];
}

// Interfaces para streaming (si es necesario)
export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: "assistant";
      content?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
  }>;
}

// Helper types para validación
export function isPromptBasedRequest(
  request: ChatRequest,
): request is PromptBasedRequest {
  return "prompt" in request;
}

export function isMessagesBasedRequest(
  request: ChatRequest,
): request is MessagesBasedRequest {
  return "messages" in request;
}

export function isToolFunction(tool: ToolDefinition): tool is ToolFunction {
  return "type" in tool && tool.type === "function" && "function" in tool;
}

export function isLegacyToolDefinition(
  tool: ToolDefinition,
): tool is LegacyToolDefinition {
  return (
    "name" in tool &&
    "description" in tool &&
    "parameters" in tool &&
    !("type" in tool)
  );
}

// Ejemplo de uso
const exampleTool: ToolFunction = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get the current weather in a given location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. San Francisco, CA",
        },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Temperature unit",
        },
      },
      required: ["location"],
    },
  },
};

const exampleRequest: MessagesBasedRequest = {
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the weather in Tokyo?" },
  ],
  tools: [exampleTool],
  temperature: 0.7,
  max_tokens: 500,
};
