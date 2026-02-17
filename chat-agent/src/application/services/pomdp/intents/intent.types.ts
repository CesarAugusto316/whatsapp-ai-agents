// ============================================
// 1. NAMESPACE POR DOMINIO (sin colisiones)
// ============================================

export type ModuleKind =
  // ============================================
  // CORE MODULES (siempre activos, domain-agnostic)
  // ============================================
  | "informational"
  | "social-protocol"
  | "conversational-signal"

  // ============================================
  // BUSINESS MODULES (activos según configuración)
  // ============================================
  | "booking"
  | "products"
  | "delivery"; // futuro

export type DomainKind =
  | "restaurant"
  | "real-estate"
  | "erotic"
  | "retail"
  | "medical"
  | null; // ← null para módulos core (no tienen dominio)

export type RequiredConfirmation = "always" | "never" | "maybe";

export interface IntentExample<I extends string> {
  intentKey: I;
  module: ModuleKind;
  domain: DomainKind;
  requiresConfirmation: RequiredConfirmation;
  lang: "es" | "en";
  examples: string[];
}

export type SocialProtocolIntent =
  | "social:greeting"
  | "social:goodbye"
  | "social:thanks"
  | "signal:affirmation"
  | "signal:negation"
  | "signal:uncertainty";

export type InformationalIntentKey =
  | "info:ask_price"
  | "info:ask_location"
  | "info:ask_business_hours"
  | "info:ask_payment_methods"
  | "info:ask_contact"
  | "info:ask_delivery_time"
  | "info:ask_delivery_method";

export type BookingIntentKey =
  // workflows
  | "booking:create"
  | "booking:modify"
  | "booking:cancel"
  // conversational
  | "booking:check_availability";

export type ProductIntentKey =
  // conversational
  | "restaurant:view_menu"
  | "restaurant:find_dishes"
  | "restaurant:recommend_dishes"
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
  | ProductIntentKey
  | BookingIntentKey
  | EroticIntentKey;

export type CoreIntentKey =
  | ProductIntentKey
  | BookingIntentKey
  | EroticIntentKey;

// ============================================
// 2. CONVERSATIONAL SIGNALS (no son intents, do not need vectorize)
// ============================================
export type ConversationalSignal =
  | "affirmation" // sí, ok, dale
  | "negation" // no, no quiero
  | "uncertainty"; // no sé, tal vez
