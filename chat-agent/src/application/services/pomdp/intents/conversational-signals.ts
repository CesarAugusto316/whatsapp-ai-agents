import {
  ConversationalSignal,
  ModuleKind,
  SocialProtocolIntent,
} from "./intent.types";

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
    /^(sí|si|ok|dale|claro|perfecto|exacto|correcto|vamos|afirmativo|sep|simon|oki|vale|sip)$/i,
  negation: /^(no|nop|nope|nel|nanai|ya no|tampoco|nada|nunca)$/i,
  uncertainty:
    /^(no sé|tal vez|quizás|puede ser|no estoy seguro|mmm|nose|no se|mas o menos)$/i,
};

/**
 * Detecta protocolos sociales y señales conversacionales TRIVIALES
 * para evitar procesamiento RAG innecesario.
 *
 * Filosofía: Minimalista. Solo skip mensajes de 1-3 palabras que son
 * obviamente protocolos/señales. El resto → vectorizar + cachear.
 * @returns true si el mensaje debe saltarse el flujo de RAG/LLM
 */
export function shouldSkipProcessing(msg: string): {
  skip: boolean;
  kind: "social-protocol" | "conversational-signal" | null;
  msg: SocialProtocolIntent | null;
} {
  const text = msg.trim();
  const words = text.split(/\s+/).length;

  // Filosofía: Solo skip para mensajes MUY cortos (1-3 palabras)
  // Mensajes más largos → vectorizar (porque se cachean de todos modos)
  if (words > 3) {
    return { skip: false, kind: null, msg: null };
  }

  // Protocolos sociales
  for (const [signal, regex] of Object.entries(socialProtocols)) {
    if (regex.test(text)) {
      const type = signal as SocialProtocol;
      return {
        skip: true,
        kind: "social-protocol" satisfies ModuleKind,
        msg: (type === ("greeting" satisfies SocialProtocol)
          ? "social:greeting"
          : type === ("goodbye" satisfies SocialProtocol)
            ? "social:goodbye"
            : "social:thanks") satisfies SocialProtocolIntent,
      };
    }
  }

  // Señales conversacionales
  for (const [signal, regex] of Object.entries(conversationalSignals)) {
    if (regex.test(text)) {
      return {
        skip: true,
        kind: "conversational-signal" satisfies ModuleKind,
        msg: (signal === ("affirmation" satisfies ConversationalSignal)
          ? "signal:affirmation"
          : signal === ("negation" satisfies ConversationalSignal)
            ? "signal:negation"
            : "signal:uncertainty") satisfies SocialProtocolIntent,
      };
    }
  }

  return { skip: false, kind: null, msg: null };
}
