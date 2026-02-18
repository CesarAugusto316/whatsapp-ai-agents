import type { IntentExample, IntentExampleKey } from "./intent.types";
export { GENERAL_DOMAIN } from "./intent.types";
import {
  restaurantBooking,
  restaurantProducts,
  restaurantOrders,
} from "./restaurant/intent-examples";
import {
  basicInformation,
  conversationalSignals,
  socialProtocols,
} from "./general-intents";

export const intentExamples = [
  ...socialProtocols,
  ...conversationalSignals,
  ...basicInformation,

  ...restaurantBooking,
  ...restaurantProducts,
  ...restaurantOrders,
] as readonly IntentExample<IntentExampleKey>[];
