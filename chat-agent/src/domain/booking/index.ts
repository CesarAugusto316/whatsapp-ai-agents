export { isWithinHolydayRange } from "./check-next-holyday";
export { isWithinBusinessHours } from "./is-within-business-hours";
export {
  BOOL,
  CustomerSignals,
  BookingOptions,
  BookingStatuses,
  CUSTOMER_INTENT,
} from "./booking.types";
export type {
  AgentArgs,
  CustomerActionKey,
  BookingOption,
  BookingStatus,
  BookingState,
  FMStatus,
  CustomerActionValue,
} from "./booking.types";

export { generateAgentGoals } from "./prompts/agent-goals";
export { WRITING_STYLE, basePrompt } from "./prompts/base-prompt";
export { businessInfoChunck } from "./prompts/business-info-chunk";
export { intentClassifierPrompt } from "./prompts/intent-classifier-prompt";
export { askForMissingData } from "./prompts/ask-for-missing-data";
export {
  getRandomOnboardingMsg,
  socialProtocolChunk,
} from "./prompts/social-chunks";
