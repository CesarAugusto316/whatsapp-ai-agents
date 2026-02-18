import { IntentExample, IntentExampleKey } from "./intent.types";
import {
  restaurantBooking,
  restaurantOrders,
  restaurantProducts,
} from "./restaurant/intent-examples";
import {
  basicInformation,
  conversationalSignals,
  socialProtocols,
} from "./shared-intents";

export const intentExamples = [
  ...socialProtocols,
  ...conversationalSignals,

  ...basicInformation,
  ...restaurantBooking,
  ...restaurantProducts,
  ...restaurantOrders,
] as readonly IntentExample<IntentExampleKey>[];
