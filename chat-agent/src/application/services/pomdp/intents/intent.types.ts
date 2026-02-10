// ============================================
// 1. NAMESPACE POR DOMINIO (sin colisiones)
// ============================================

export type ModuleKind =
  | "restaurant"
  | "booking"
  | "erotic"
  | "real-state"
  | "informational"
  | "social-protocol"
  | "conversational-signal";

export interface IntentExample<I extends string> {
  intent: I;
  module: ModuleKind;
  requiresConfirmation?: boolean;
  lang: "es" | "en";
  examples: string[];
}

export type SocialProtocolIntent =
  | "social:greeting"
  | "social:goodbye"
  | "social:thanks"
  | "signal:affirmation"
  | "signal:negation"
  | "signal:uncertainty"
  | "signal:request_help"
  | "signal:request_human";

export type InformationalIntentKey =
  | "info:ask_price"
  | "info:ask_location"
  | "info:ask_business_hours"
  | "info:ask_payment_methods"
  | "info:ask_contact";

export type BookingIntentKey =
  // workflows
  | "booking:create"
  | "booking:modify"
  | "booking:cancel"
  // conversational
  | "booking:check_availability";

export type RestaurantIntentKey =
  // conversational
  | "restaurant:view_menu"
  | "restaurant:find_dishes"
  | "restaurant:recommend_dishes"
  | "restaurant:ask_delivery_time"
  | "restaurant:ask_delivery_method"
  | "restaurant:ask_price"
  // workflows
  | "restaurant:place_order"
  | "restaurant:update_order"
  | "restaurant:cancel_order";

export type EroticIntentKey =
  | "erotic:view_content"
  | "erotic:purchase_content"
  | "erotic:ask_services";

export type IntentExampleKey =
  | SocialProtocolIntent
  | InformationalIntentKey
  | RestaurantIntentKey
  | BookingIntentKey
  | EroticIntentKey;

// ============================================
// 2. CONVERSATIONAL SIGNALS (no son intents, do not need vectorize)
// ============================================
export type ConversationalSignal =
  | "affirmation" // sí, ok, dale
  | "negation" // no, no quiero
  | "uncertainty" // no sé, tal vez
  | "request_help" // ayuda, no entiendo
  | "request_human"; // hablar con persona
