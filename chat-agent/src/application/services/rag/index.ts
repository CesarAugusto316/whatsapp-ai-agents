export { ragService } from "./rag.service";

// intents
export {
  eroticIntents,
  restaurantIntents,
} from "./intents/specialized-intents";
export { bookingIntents, globalIntents } from "./intents/transversal-intents";

// types
export type {
  SpecializedDomain,
  SpecializedSemanticIntent,
} from "./intents/specialized-intents";
export type {
  TransversalIntentKey,
  BookingIntentKey,
  GlobalSemanticIntent,
  CoreDomain,
} from "./intents/transversal-intents";
export type { SemanticIntent, SyncStateRequest } from "./rag.types";
