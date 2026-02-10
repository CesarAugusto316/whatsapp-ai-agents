import { ConversationalSignal } from "./intent.types";

export type SocialProtocol = "greeting" | "goodbye" | "thanks";

export const socialProtocols: Record<SocialProtocol, RegExp> = {
  greeting:
    /^(hola+|ola+|holi+s?|buenas?( (tardes?|días?|noches?))?|qué tal|que tal|hey+|hi+|saludos?)$/i,
  goodbye:
    /^(chau+|adiós|adios|hasta (luego|pronto|mañana|la vista)|nos vemos|bye+|ciao+)$/i,
  thanks: /^(gracias+|muchas gracias|mil gracias|thx|thanks|ty|thank you)$/i,
};

export const conversationalSignals: Record<ConversationalSignal, RegExp> = {
  affirmation:
    /^(sí|si|ok|dale|claro|perfecto|exacto|correcto|vamos|afirmativo|sep|simon|oki)$/i,
  negation: /^(no|nop|nope|nel|nanai|ya no|tampoco|nada|nunca)$/i,
  uncertainty: /^(no sé|tal vez|quizás|puede ser|no estoy seguro|mmm|nose)$/i,
  request_help: /^(ayuda|no entiendo|explica|cómo funciona|help|auxilio)$/i,
  request_human:
    /^(hablar con|persona|humano|operador|alguien|dueño|propietario|encargado)$/i,
};

/**
 * Decide si el mensaje debe saltarse el flujo de RAG/LLM
 * para ahorrar recursos y responder instantáneamente.
 *
 * @returns true si el mensaje debe saltarse el flujo de RAG/LLM
 */
export function shouldSkipProcessing(msg: string): {
  skip: boolean;
  signal: SocialProtocol | ConversationalSignal | null;
  kind: "social-protocol" | "conversational-signal" | null;
} {
  const text = msg.trim();
  const words = text.split(/\s+/).length;

  // Si el mensaje es muy largo, lo mandamos al flujo normal (LLM)
  // aunque contenga un "hola", porque probablemente hay una consulta después.
  if (words > 4) {
    return { skip: false, signal: null, kind: null };
  }

  // Revisar protocolos sociales (Saluditos, gracias, etc)
  for (const [signal, regex] of Object.entries(socialProtocols)) {
    if (regex.test(text)) {
      return {
        skip: true,
        signal: signal as SocialProtocol,
        kind: "social-protocol",
      };
    }
  }

  // Revisar señales de control (Si, No, Ayuda)
  for (const [signal, regex] of Object.entries(conversationalSignals)) {
    if (regex.test(text)) {
      return {
        skip: true,
        signal: signal as ConversationalSignal,
        kind: "conversational-signal",
      };
    }
  }

  return { skip: false, signal: null, kind: null };
}
