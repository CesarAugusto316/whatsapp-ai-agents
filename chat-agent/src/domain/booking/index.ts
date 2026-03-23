export { isWithinHolydayRange } from "./check-next-holyday";
export { isWithinBusinessHours } from "./is-within-business-hours";
export {
  BOOL,
  CustomerSignals,
  MainOptions,
  BookingStatuses,
  CUSTOMER_INTENT,
} from "./booking.types";
export type {
  AgentArgs,
  CustomerSignal,
  BookingOption,
  BookingStatus,
  BookingState,
  FMStatus,
  CustomerSignalKey as CustomerSignalKey,
} from "./booking.types";

export { generateAgentGoals } from "./prompts/agent-goals";
export { basePrompt } from "./prompts/base-prompt";
export { businessInfoChunck } from "./prompts/business-info-chunk";
export { intentClassifierPrompt } from "./prompts/intent-classifier-prompt";
export { askForMissingData } from "./prompts/ask-for-missing-data";
export {
  getRandomOnboardingMsg,
  socialProtocolChunk,
} from "./prompts/social-chunks/social-chunks";

export {
  WRITING_STYLE,
  SECURITY_RULES,
  CONVERSATION_BEHAVIOR,
  FORMAT_RULES,
  getGlobalRules,
} from "./prompts/global-rules";

export type {
  ModuleCtx,
  DomainCtx as DomainCtx,
} from "./booking-context.types";
