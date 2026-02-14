import { Business } from "@/infraestructure/adapters/cms";
import { WRITING_STYLE } from "./prompts";
import { SocialProtocolIntent } from "@/application/services/pomdp";

const variants = [
  (name: string, business: string) => `
      ¡Hola! 👋 Soy ${name} de ${business}.

      Puedo ayudarte con:
      🍽️ Reservas (crear/modificar/cancelar)
      📋 Pedidos y menú
      📍 Horarios, dirección y más

      ¿En qué te ayudo hoy? 😊
    `,

  (name: string, business: string) => `
      ¡Hola! 👋 Soy ${name}, asistente de ${business}.

      Aquí puedes:
      🍽️ Reservar mesa
      📋 Ver menú y pedir
      📍 Consultar info básica

      ¿Qué necesitas? 😊
    `,

  (name: string, business: string) => `
      ¡Hola mucho gusto! 👋 Soy ${name} de ${business}.

      Te ayudo con:
      🍽️ Reservas
      📋 Pedidos y menú
      📍 Información del local

      ¿En qué te echo una mano? ✨
    `,

  (name: string, business: string) => `
      ¡Hola! 👋 Soy ${name} de ${business}.

      Puedo ayudarte a:
      🍽️ Reservar mesa
      📋 Hacer pedidos
      📍 Consultar horarios y ubicación

      ¿Qué te apetece hoy? 😊
    `,

  (name: string, business: string) => `
      ¡Hola! 👋 Soy ${name}, tu asistente en ${business}.

      Aquí puedes:
      🍽️ Gestionar reservas
      📋 Ver menú y pedir
      📍 Consultar información

      ¿En qué te ayudo? 😊
    `,

  (name: string, business: string) => `
      ¡Que tal! 👋 Soy ${name} de ${business}.

      Te ofrezco:
      🍽️ Reservas (crear/modificar/cancelar)
      📋 Menú y pedidos
      📍 Info: horarios, dirección, contacto

      ¿Qué necesitas? 😊
    `,

  (name: string, business: string) => `
      ¡Hola que tal! 👋 Soy ${name} de ${business}.

      Puedo ayudarte con:
      🍽️ Reservar mesa
      📋 Pedidos para llevar o domicilio
      📍 Horarios y ubicación

      ¿En qué te ayudo hoy? ✨
    `,

  (name: string, business: string) => `
      ¡Hola! 👋 Soy ${name}, asistente de ${business}.

      Aquí puedes:
      🍽️ Reservar y gestionar tu mesa
      📋 Ver menú y hacer pedidos
      📍 Consultar información básica

      ¿Qué te apetece? 😊
    `,

  (name: string, business: string) => `
      ¡Hola! 👋 Mi nombre es ${name} de ${business}.

      Te ayudo con:
      🍽️ Reservas de mesa
      📋 Menú y pedidos
      📍 Horarios, dirección y más

      ¿En qué te echo una mano? 😊
    `,

  (name: string, business: string) => `
      ¡Hola! 👋 Me llamo ${name} de ${business}.

      Puedo ayudarte a:
      🍽️ Reservar tu mesa
      📋 Ver menú y pedir comida
      📍 Consultar horarios y ubicación

      ¿Qué necesitas hoy? ✨
    `,
] as const;

export const getRandomOnboardingMsg = (
  assistantName: string,
  businessName: string,
): string => {
  const randomIndex = Math.floor(Math.random() * variants.length);
  return variants[randomIndex](assistantName, businessName).trim();
};

export function socialProtocolChunk(
  intentKey: SocialProtocolIntent,
  business: Business,
): string {
  const { assistantName, name, general } = business;
  const businessName = `${general.businessType} ${name}`;

  // Base: identidad del asistente (siempre necesaria)
  const base = `
      You are ${assistantName}, assistant for ${businessName}.

      RULES:
      - Be warm but concise
      - NEVER ask for user input in goodbye/thanks
      - For greetings: adapt depth based on user state (new vs returning)

      WRITING STYLE:
      ${WRITING_STYLE}
  `.trim();

  // Respuestas predefinidas (el LLM solo formatea, no inventa)
  const responses: Partial<Record<SocialProtocolIntent, string>> = {
    "social:greeting": `
        RESPONSE GUIDELINE:
        Brief greeting only + warm CTA ("¿En qué te ayudo hoy?")
      `,

    "social:goodbye": `
        RESPONSE GUIDELINE:
        Short farewell + optional well-wishing ("¡Que tengas buen día! 😊")
    `,

    "social:thanks": `
        RESPONSE GUIDELINE:
        Acknowledge thanks briefly ("¡De nada! 😊") + optional CTA ("¿Algo más?")
    `,
  };

  return `${base}\n\n${(responses[intentKey] ?? "").trim()}`;
}
