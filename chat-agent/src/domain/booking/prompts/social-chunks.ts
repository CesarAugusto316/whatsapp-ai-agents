import type { SocialProtocolIntent } from "@/application/services/pomdp";
import type { RestaurantCtx } from "@/domain/restaurant";
import { basePrompt } from "./base-prompt";

const firstMessageVariants = [
  // V1 - Detallada pero fluida
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name} de ${business}.

    Contigo puedo:
    🍽️ Reservar mesa
    📋 Mostrarte el menú, recomendarte platos o tomar tu pedido
    🚶 Para llevar o para retirar en el local — tú eliges
    📍 Darte horarios, dirección y cómo llegar

    ¿Por dónde empezamos? 😊
  `,

  // V2 - Enfocada en flexibilidad
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name}, asistente de ${business}.

    Te ayudo con:
    🍽️ Reservas: crear, cambiar cuando quieras
    📋 Pedidos: para llevar a casa o retirar en el local
    🔍 Buscar platos por lo que te apetece (vegetariano, picante...)
    📍 Horarios, dirección y formas de pago

    ¿Qué te apetece hoy? ✨
  `,

  // V3 - Cálida y completa
  (name: string, business: string) => `
    ¡Hola! 👋 Mucho gusto, soy ${name} de ${business}.

    Puedo ayudarte a:
    🍽️ Reservar mesa (y cambiarla después si lo necesitas)
    📋 Ver el menú completo o recomendarte algo rico
    🛵 Pedir para llevar o para retirar en el local
    📍 Saber horarios, dónde estamos y cómo contactarnos

    ¿En qué te echo una mano? 😊
  `,

  // V4 - Directa y práctica
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name} de ${business}.

    Aquí puedes:
    🍽️ Hacer una reserva y ajustarla después
    📋 Pedir comida: para llevar o para recoger aquí
    🔍 Buscar platos según tus gustos o pedirme recomendaciones
    📍 Ver horarios, dirección y formas de pago

    ¿Qué necesitas? 😊
  `,

  // V5 - Enfocada en personalización
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name}, tu asistente en ${business}.

    Te ayudo a:
    🍽️ Reservar mesa y modificarla cuando quieras
    📋 Descubrir platos que te encantarán (dime tus preferencias)
    🛵 Hacer pedidos: para llevar a casa o retirar en el local
    📍 Consultar horarios, ubicación y más

    ¿Por dónde empezamos? ✨
  `,

  // V6 - Coloquial y cercana
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name} de ${business}.

    Por aquí puedes:
    🍽️ Reservar mesa y cambiarla después sin problema
    📋 Echar un ojo al menú, pedirme recomendaciones o hacer tu pedido
    🚶 Llevarlo a casa o pasarte a recogerlo cuando quieras
    📍 Ver horarios, dónde estamos y cómo llegar

    ¿Qué te apetece? 😊
  `,

  // V7 - Clara y estructurada
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name} de ${business}.

    Te ayudo con:
    🍽️ Reservas: crear, ver disponibilidad
    📋 Pedidos: para llevar a domicilio o retirar en el local
    🔍 Buscar platos por preferencias o pedir recomendaciones
    📍 Información: horarios, dirección, pago y entrega

    ¿En qué te ayudo hoy? ✨
  `,

  // V8 - Enfocada en experiencia
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name}, asistente de ${business}.

    Puedo ayudarte a:
    🍽️ Reservar tu mesa ideal
    📋 Descubrir platos que te gusten o hacer tu pedido fácilmente
    🛵 Elegir entre llevarlo a casa o recogerlo aquí mismo
    📍 Saber cuándo abrimos, dónde estamos y cómo contactarnos

    ¿Qué necesitas hoy? 😊
  `,

  // V9 - Breve pero completa
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name} de ${business}.

    Conmigo puedes:
    🍽️ Reservar, cambiar o cancelar tu mesa
    📋 Ver menú, pedir recomendaciones o hacer tu pedido
    🚶 Para llevar o para retirar en el local
    📍 Horarios, dirección y más info

    ¿Por dónde empezamos? 😊
  `,

  // V10 - Amigable y detallada
  (name: string, business: string) => `
    ¡Hola! 👋 Me llamo ${name} de ${business}.

    Te ayudo con:
    🍽️ Reservar mesa y ajustarla cuando necesites
    📋 Mostrarte el menú, recomendarte platos o tomar tu pedido
    🛵 Para llevar a casa o para recoger en el local — tú decides
    📍 Horarios, dirección, formas de pago y entrega

    ¿En qué te echo una mano hoy? ✨
  `,
  // V1 - Clara y directa
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name} de ${business}.

    Puedo ayudarte con:
    🍽️ Reservas (crear, modificar o cancelar)
    📋 Pedidos y menú
    📍 Horarios, dirección y más

    ¿En qué te ayudo hoy? 😊
  `,

  // V2 - Cercana
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name}, asistente de ${business}.

    Te puedo ayudar a:
    🍽️ Reservar mesa
    📋 Ver el menú y hacer pedidos
    📍 Saber horarios, dirección y más

    ¿Qué necesitas? 😊
  `,

  // V3 - Cálida
  (name: string, business: string) => `
    ¡Hola! 👋 Mucho gusto, soy ${name} de ${business}.

    Conmigo puedes:
    🍽️ Hacer reservas (y cambiarlas si lo necesitas)
    📋 Pedir comida y ver el menú
    📍 Ver horarios, dónde estamos y más

    ¿En qué te echo una mano? ✨
  `,

  // V4 - Informal
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name} de ${business}.

    Te ayudo con:
    🍽️ Reservar mesa
    📋 Pedir algo de comer
    📍 Ver horarios y ubicación

    ¿Qué te apetece hoy? 😊
  `,

  // V5 - Amigable
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name}, tu asistente en ${business}.

    Puedo ayudarte a:
    🍽️ Reservar y cambiar tu mesa
    📋 Ver el menú y pedir
    📍 Consultar horarios y dónde estamos

    ¿En qué te ayudo? 😊
  `,

  // V6 - Colloquial (España)
  (name: string, business: string) => `
    ¡Hola! 👋 Soy ${name} de ${business}.

    Por aquí puedes:
    🍽️ Reservar mesa (y modificarla cuando quieras)
    📋 Echar un vistazo al menú y pedir
    📍 Ver horarios, dirección y más

    ¿Qué necesitas? 😊
  `,
] as const;

export const getRandomOnboardingMsg = (ctx: RestaurantCtx): string => {
  const {
    business: { assistantName, name },
  } = ctx;
  const randomIndex = Math.floor(Math.random() * firstMessageVariants.length);
  return firstMessageVariants[randomIndex](assistantName, name).trim();
};

export function socialProtocolChunk(
  intentKey: SocialProtocolIntent,
  ctx: RestaurantCtx,
): string {
  // Base: identidad del asistente (siempre necesaria)
  const base = `
    ${basePrompt(ctx)}

    INTENT DETECTED:
    ${intentKey}

    RULES:
    - No menciones el intento detectado.
    - You Never invent information,
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
