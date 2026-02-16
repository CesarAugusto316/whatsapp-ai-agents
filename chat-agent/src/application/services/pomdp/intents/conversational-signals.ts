import {
  ConversationalSignal,
  ModuleKind,
  SocialProtocolIntent,
} from "./intent.types";

export type SocialProtocol = "greeting" | "goodbye" | "thanks";

/**
 * Helper para crear regex tolerante a variaciones
 * - Letras repetidas: hoooola, holaaa
 * - Typos comunes: ola, holaq
 * - Expresiones regionales de LATAM y España
 */
const repeat = (char: string, min = 1, max = 5) => `${char}{${min},${max}}`;
const opt = (char: string) => `${char}?`;
const optAccent = (char: string) =>
  `[${char}${char.toUpperCase()}${char.toLowerCase()}]`;

export const socialProtocols: Record<SocialProtocol, RegExp> = {
  // HOLA: incluye "ola", "holi", "holaa", "holaaa", "holaq" (typo común)
  // BUENAS: "buenas", "buenos días/tardes/noches" con variaciones
  // QUE TAL: "q tal", "qué tal", "que tal"
  // Regionales: "quiubo", "qué onda", "qué hubo", "xou" (México), "epa" (Venezuela/Colombia)
  greeting: new RegExp(
    `^(${repeat("h", 0, 2)}o${repeat("l", 1, 2)}a${repeat("a", 0, 3)}[qk]?|` +
      `o${repeat("l", 1, 2)}a${repeat("a", 0, 3)}|` +
      `holi${repeat("s", 0, 2)}|` +
      `buen[ao]s?( (tardes?|d[ií]as?|noches?))?|` +
      `q?u?e? tal|` +
      `hey+|hi+|` +
      `saludos?|` +
      `qui${optAccent("u")}bo|qui${optAccent("u")}p[ao]|` +
      `xou|` +
      `epa|` +
      `buen d[ií]a)${repeat("[!¡]", 0, 2)}$`,
    "i",
  ),

  // ADIÓS: incluye "adios", "adióss", "adio"
  // CHAU: "chau", "chauu", "chao", "chaoito"
  // HASTA: "hasta luego/pronto/mañana/la vista"
  // Regionales: "nos vidrios" (Argentina), "lueguito" (México/Colombia)
  goodbye: new RegExp(
    `^(chau${repeat("u", 0, 2)}|` +
      `chao(ito)?|` +
      `adi${optAccent("o")}s${repeat("s", 0, 2)}|` +
      `hasta (luego|pronto|mañana|la vista|lueguito|prontito)|` +
      `nos (vemos|vidrios|vemo)|` +
      `bye+|` +
      `ciao+|` +
      `me voy|` +
      `hasta otra|` +
      `nos vemos luego)${repeat("[!¡]", 0, 2)}$`,
    "i",
  ),

  // GRACIAS: incluye "graciass", "grax", "gracias mil"
  // Regionales: "graxias" (typo), "millones de gracias"
  thanks: new RegExp(
    `^(graci${repeat("a", 1, 2)}s${repeat("s", 0, 2)}|` +
      `grax(ias)?|` +
      `muchas gracias|` +
      `mil gracias|` +
      `millones de gracias|` +
      `te lo agradezco|` +
      `thx|thanks|ty|thank you)${repeat("[!¡]", 0, 2)}$`,
    "i",
  ),
};

export const conversationalSignals: Record<ConversationalSignal, RegExp> = {
  // AFIRMACIÓN: incluye "sii", "si", "sip", "síp", "simón" (México), "vale" (España)
  // Regionales: "dale" (Argentina/Uruguay), "de una" (Colombia), "orale" (México)
  affirmation: new RegExp(
    `^(s${optAccent("i")}${repeat("i", 0, 2)}p?|` +
      `sim${optAccent("o")}n|` +
      `ok|oki|` +
      `dale|` +
      `clar${optAccent("i")}simo|claro|` +
      `perfecto|` +
      `exacto|` +
      `correcto|` +
      `vamos|` +
      `afirmativo|` +
      `vale|` +
      `de una( vez)?|` +
      `${optAccent("o")}rale|` +
      `obvio|` +
      `por supuesto|` +
      `as${optAccent("i")} es)${repeat("[!¡]", 0, 2)}$`,
    "i",
  ),

  // NEGACIÓN: incluye "noo", "nop", "nope", "nel" (México)
  // Regionales: "para nada", "ni loco", "de ninguna manera"
  negation: new RegExp(
    `^(no${repeat("o", 0, 2)}|` +
      `nop${repeat("p", 0, 1)}|` +
      `nope|` +
      `nel${repeat("l", 0, 1)}|` +
      `nanai|` +
      `ya no|` +
      `tampoco|` +
      `nada|` +
      `nunca|` +
      `para nada|` +
      `ni loco|` +
      `de ninguna manera|` +
      `ni hablar|` +
      `q${optAccent("u")} ${optAccent("v")}a)${repeat("[!¡]", 0, 2)}$`,
    "i",
  ),

  // INCERTIDUMBRE: incluye "no sé", "nose", "no se", "tal vez", "quizás"
  // Regionales: "puede ser", "más o menos", "medio", "más o menos así"
  uncertainty: new RegExp(
    `^(no s${optAccent("e")}|` +
      `nose|no se|` +
      `tal vez|` +
      `quiz${optAccent("a")}s|` +
      `puede ser|` +
      `no estoy segur[oa]|` +
      `mmm+|` +
      `m${optAccent("a")}s o menos( as${optAccent("i")})?|` +
      `medio|` +
      `no creo|` +
      `no s${optAccent("e")} bien|` +
      `tengo dudas|` +
      `est${optAccent("a")} dif${optAccent("i")}cil|` +
      `veremos|` +
      `ya ver${optAccent("e")})${repeat("[!¡]", 0, 2)}$`,
    "i",
  ),
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
