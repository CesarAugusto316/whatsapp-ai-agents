import { ConversationalSignal } from "./intent.types";

export type SocialProtocol = "greeting" | "goodbye" | "thanks";

export const socialProtocols: Record<SocialProtocol, RegExp> = {
  // Añadimos variaciones comunes y errores típicos (ola, holi, etc.)
  greeting:
    /\b(hola|holaa|ola|holi|holis|buenas|buen día|buenos días|qué tal|que tal|hey|hi)\b/i,
  goodbye: /\b(chau|adiós|adios|hasta luego|nos vemos|bye|byee)\b/i,
  thanks: /\b(gracias|muchas gracias|graciass|gracias!|thx|thanks|ty)\b/i,
};

export const conversationalSignals: Record<ConversationalSignal, RegExp> = {
  affirmation:
    /\b(sí|si|ok|dale|claro|perfecto|exacto|correcto|vamos|afirmativo)\b/i,
  negation: /\b(no|nop|nope|nel|nanai|ya no|tampoco)\b/i,
  uncertainty: /\b(no sé|tal vez|quizás|puede ser|no estoy seguro)\b/i,
  request_help: /\b(ayuda|no entiendo|explica|cómo funciona)\b/i,
  request_human: /\b(hablar con|persona|humano|operador|alguien)\b/i,
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
