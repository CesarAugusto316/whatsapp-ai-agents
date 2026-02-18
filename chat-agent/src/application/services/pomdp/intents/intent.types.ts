export const GENERAL_DOMAIN = "general" as const;
// ============================================
// 1. NAMESPACE POR DOMINIO (sin colisiones)
// ============================================

export type ModuleKind =
  // ============================================
  // GENERAL MODULES (siempre activos, domain-agnostic)
  // ============================================
  | "informational"
  | "social-protocol"
  | "conversational-signal"

  // ============================================
  // BUSINESS MODULES (activos según configuración)
  // ============================================
  | "booking"
  | "products"
  | "orders"
  | "delivery"; // futuro

export type SpecializedDomain =
  | "restaurant"
  | "real-estate"
  | "erotic"
  | "retail"
  | "medical";

export type AllDomainKind = SpecializedDomain | typeof GENERAL_DOMAIN; // ←  para módulos core (no tienen dominio)

export type RequiredConfirmation = "always" | "never" | "maybe";

export interface IntentExample<I extends string> {
  intentKey: I;
  module: ModuleKind;
  domain: AllDomainKind;
  requiresConfirmation: RequiredConfirmation;
  lang: "es" | "en";
  examples: string[];
}

// general domain
export type SocialProtocolIntent =
  | "social:greeting"
  | "social:goodbye"
  | "social:thanks"
  | "signal:affirmation"
  | "signal:negation"
  | "signal:uncertainty";

// general domain
export type InformationalIntentKey =
  | "info:ask_price"
  | "info:ask_location"
  | "info:ask_business_hours"
  | "info:ask_payment_methods"
  | "info:ask_contact"
  | "info:ask_delivery_time"
  | "info:ask_delivery_method";

// specialized domain
export type BookingIntentKey =
  // workflows
  | "booking:create"
  | "booking:modify"
  | "booking:cancel"
  // conversational
  | "booking:check_availability";

// ============================================
// PRODUCT INTENTS (consulta/exploración)
// ============================================
export type ProductIntentKey =
  | "products:view"
  | "products:find"
  | "products:recommend";

// ============================================
// ORDER INTENTS (workflow/acción)
// ============================================
export type OrderIntentKey =
  | "orders:create"
  | "orders:modify"
  | "orders:cancel";

export type ProductOrderIntentKey = ProductIntentKey | OrderIntentKey;

export type IntentExampleKey =
  | SocialProtocolIntent
  | InformationalIntentKey
  | BookingIntentKey
  | ProductIntentKey
  | OrderIntentKey;

// ============================================
// 2. CONVERSATIONAL SIGNALS (no son intents, do not need vectorize)
// ============================================
export type ConversationalSignal =
  | "affirmation" // sí, ok, dale
  | "negation" // no, no quiero
  | "uncertainty"; // no sé, tal vez
