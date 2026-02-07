export { ragService } from "./rag.service";

// intents
export {
  eroticIntents,
  restaurantIntents,
  bookingIntents,
} from "./intents/specialized-intents";
export { transversalIntents } from "./intents/transversal-intents";

// types
export type {
  BookingIntentKey,
  RestaurantIntentKey,
  EroticIntentKey,
} from "./intents/specialized-intents";

export type { TransversalIntentKey } from "./intents/transversal-intents";

export type {
  SemanticIntent,
  SyncStateRequest,
  DomainKinds,
} from "./rag.types";
