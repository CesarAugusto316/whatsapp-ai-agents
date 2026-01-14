type ProviderOptions = Record<string, string>;

type AssistantModelMessage = {
  role: "assistant";
  content: AssistantContent;
  /**
    Additional provider-specific metadata. They are passed through
    to the provider from the AI SDK and enable provider-specific
    functionality that can be fully encapsulated in the provider.
     */
  providerOptions?: ProviderOptions;
};

/**
Content of an assistant message.
It can be a string or an array of text, image, reasoning, redacted reasoning, and tool call parts.
 */
type AssistantContent = string | Array<TextPart | ToolResultPart>;

/**
 A system message. It can contain system information.

 Note: using the "system" part of the prompt is strongly preferred
 to increase the resilience against prompt injection attacks,
 and because not all providers support several system messages.
 */
type SystemModelMessage = {
  role: "system";
  content: string;
  /**
      Additional provider-specific metadata. They are passed through
      to the provider from the AI SDK and enable provider-specific
      functionality that can be fully encapsulated in the provider.
       */
  providerOptions?: ProviderOptions;
};

interface ToolResultPart {
  type: "tool-result";
  /**
  ID of the tool call that this result is associated with.
   */
  toolCallId: string;
  /**
  Name of the tool that generated this result.
    */
  toolName: string;
  /**
  Result of the tool call. This is a JSON-serializable object.
     */
  output: unknown;
  /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;
}

/**
A tool message. It contains the result of one or more tool calls.
 */
type ToolModelMessage = {
  role: "tool";
  content: ToolContent;
  /**
    Additional provider-specific metadata. They are passed through
    to the provider from the AI SDK and enable provider-specific
    functionality that can be fully encapsulated in the provider.
     */
  providerOptions?: ProviderOptions;
};
/**
Content of a tool message. It is an array of tool result parts.
 */
type ToolContent = Array<ToolResultPart>;

/**
A user message. It can contain text or a combination of text and images.
 */
type UserModelMessage = {
  role: "user";
  content: UserContent;
  /**
      Additional provider-specific metadata. They are passed through
      to the provider from the AI SDK and enable provider-specific
      functionality that can be fully encapsulated in the provider.
       */
  providerOptions?: ProviderOptions;
};

/**
Text content part of a prompt. It contains a string of text.
 */
interface TextPart {
  type: "text";
  /**
  The text content.
     */
  text: string;
  /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;
}
/**
Image content part of a prompt. It contains an image.
 */
interface ImagePart {
  type: "image";
  /**
  Image data. Can either be:

  - data: a base64-encoded string, a Uint8Array, an ArrayBuffer, or a Buffer
  - URL: a URL that points to the image
     */
  image: string | URL;
  /**
  Optional IANA media type of the image.

  @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
  mediaType?: string;
  /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;
}
/**
  Content of a user message. It can be a string or an array of text and image parts.
   */
type UserContent = string | Array<TextPart | ImagePart>;

/**
A message that can be used in the `messages` field of a prompt.
It can be a user message, an assistant message, or a tool message.
 */
export type ModelMessage =
  | SystemModelMessage
  | UserModelMessage
  | AssistantModelMessage
  | ToolModelMessage;
