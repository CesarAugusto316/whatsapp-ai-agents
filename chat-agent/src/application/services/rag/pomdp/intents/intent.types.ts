// ============================================
// 1. NAMESPACE POR DOMINIO (sin colisiones)
// ============================================
export type InformationalIntentKey =
  | "info:ask_price"
  | "info:ask_location"
  | "info:ask_hours"
  | "info:ask_payment_methods"
  | "info:ask_contact";

export type BookingIntentKey =
  | "booking:create"
  | "booking:modify"
  | "booking:cancel"
  | "booking:check_availability";

export type RestaurantIntentKey =
  | "restaurant:view_menu"
  | "restaurant:place_order"
  | "restaurant:ask_delivery_time"
  | "restaurant:ask_delivery_method"
  | "restaurant:find_dishes"
  | "restaurant:recomend_dishes"
  | "restaurant:update_order"
  | "restaurant:cancel_order";

export type EroticIntentKey =
  | "erotic:view_content"
  | "erotic:purchase_content"
  | "erotic:ask_services";

export type IntentExampleKey =
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
