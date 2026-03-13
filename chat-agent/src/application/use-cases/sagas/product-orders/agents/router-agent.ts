import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import z from "zod";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { DomainCtx } from "@/domain/booking";
import { formatSagaOutput } from "@/application/patterns";
import { BookingSagaResult } from "../../booking/booking-saga";
import { cacheAdapter } from "@/infraestructure/adapters/cache";

const routerSchema = z.enum([
  "search_agent",
  "cart_agent",
  "ask_clarification",
]);

type RouterOutput = z.infer<typeof routerSchema>;

/**
 * Historial de routing con ventana deslizante (últimos 5 eventos)
 */
type RoutingHistoryEntry = {
  agent: RouterOutput;
  timestamp: number;
  userMessage: string;
};

const ROUTING_HISTORY_KEY = "routerAgent:history";
const MAX_HISTORY_LENGTH = 5;

/**
 * Normaliza y valida el output del router
 *
 * El LLM puede retornar: "search", "cart", "search_agent", "cart_agent",
 * "ask_clarification", "clarification", "SEARCH", "Cart.", etc.
 * Esta función normaliza antes de validar y hace fallback a "search_agent" si falla
 */
const validateRouter = (raw: string): RouterOutput => {
  // Normalizar: lowercase, trim, sacar puntuación y quotes
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/["'.!¡¿?]/g, "")
    .replace(/^(search|search_agent).*$/, "search_agent")
    .replace(/^(cart|cart_agent).*$/, "cart_agent")
    .replace(
      /^(ask_clarification|clarification|clarificacion|duda|ambiguo).*$/,
      "ask_clarification",
    );

  const result = routerSchema.safeParse(normalized);

  // Fallback defensivo: si no es "cart_agent" o "ask_clarification", default a "search_agent"
  if (!result.success) {
    console.warn(
      `Router validation failed for: "${raw}" → defaulting to "ask_clarification"`,
    );
    return "ask_clarification";
  }

  return result.data;
};

function createRouterAgentPrompt(
  domain: SpecializedDomain,
  historyContext?: string,
): string {
  const vocab = DOMAIN_VOCABULARY[domain];
  const productExample1 = vocab.productExamples[0];
  const productExample2 = vocab.productExamples[1] || productExample1;

  return `
    Eres un router para un ${vocab.greetingContext}. Analiza el mensaje y decide a qué agente derivar.

    ## AGENTES

    ### search_agent
    **Cuándo:** El usuario quiere explorar, ver el ${vocab.menuWord}, buscar ${vocab.productPlural}, preguntar qué hay.
    **Frases:** "ver ${vocab.menuWord}", "¿qué ${vocab.productPlural} tienen?", "busco ${productExample1}", "¿tienen ${productExample2}?"

    ### cart_agent
    **Cuándo:** El usuario quiere gestionar su ${vocab.orderWord} (agregar, quitar, modificar, ver, confirmar),
      dar su nombre, o menciona cantidades de ${vocab.productPlural} (ej: "2 ${productExample1}s", "una ${productExample2}").
    **Frases:** "agrega 1 ...", "quiero 2 ...", "cambia este plato por ...", "mostrame mi ${vocab.orderWord} por ...", "sí, confirmado", "mi nombre es...", "2 ${productExample1}s"

    ### ask_clarification
    **Cuándo:** Mensaje corto/vago sin contexto. Producto suelto sin verbo de acción.
    **Frases:** "${productExample1}" (solo), "${productExample2}s" (sin contexto)

    ## REGLAS

    Historial de routing:
    ${historyContext || "null (primer mensaje)"}

    1. **Patrones de acción:**
      - "agrega", "pon", "dame", "quita", "saca" → cart_agent
      - "quiero ver", "busco", "¿qué tienen?" → search_agent
      - "mi nombre es", "soy" → cart_agent
      - Producto solo (sin verbo) → ask_clarification

    2. **Analiza el historial:**
      - Si "ÚltimoAgente" = "search_agent" y dice "esa", "esa quiero", "la quiero" → cart_agent
      - Si "ÚltimoAgente" = "ask_clarification" y responde "ver" / "explorar" → search_agent
      - Si "ÚltimoAgente" = "ask_clarification" y responde "agregar" / "comprar" → cart_agent
      - Si historial vacío y dice "${productExample1}" → ask_clarification

    3. **Evitar loops (CRÍTICO):**
      - Si "ClarificacionesConsecutivas" >= 2 → elige search_agent (rompe el loop)
      - Si "ClarificacionesConsecutivas" = 1 y usuario sigue ambiguo → search_agent
      - Máximo 1 clarificación por flujo

    4. **Patrones comunes de flujo:**
      - search_agent → cart_agent (flujo normal: explora luego compra)
      - ask_clarification → search_agent → cart_agent (flujo con clarificación)
      - cart_agent → cart_agent (modificaciones sucesivas)

    5. **Intención clara:**
      - "Quiero una ${productExample1}" → search_agent (primero busca)
      - "Agrega una ${productExample1}" → cart_agent
      - "quiero 1 ${productExample2}" → cart_agent (implícito: agregar)
      - "necesito 1 ${productExample2}" → cart_agent (implícito: agregar)
      - "2 ${productExample1}s" → cart_agent
      - "${productExample1}" (solo) → ask_clarification (o search_agent si "ÚltimoAgente" = search_agent)

    6. **Default:** Si hay duda → ask_clarification (EXCEPTO si "ClarificacionesConsecutivas" >= 2 → search_agent)

    ## EJEMPLOS

    "Quiero ver el ${vocab.menuWord}" → search_agent
    "¿Qué ${vocab.productPlural} tienen?" → search_agent
    "Agregame 2 ${productExample1}s" → cart_agent
    "1 ${productExample2}" → cart_agent
    "Quitame ${productExample1}" → cart_agent
    "Mostrame mi ${vocab.orderWord}" → cart_agent
    "${productExample1}" → ask_clarification
    "Mi nombre es César" → cart_agent

    ## EJEMPLOS CON ÚltimoAgente

    ÚltimoAgente = "search_agent":
    - "esa quiero" → cart_agent
    - "la quiero agregar" → cart_agent
    - "¿cuál es más barata?" → search_agent (sigue explorando)
    - "${productExample1}" → cart_agent (asume que quiere la que vio)

    ÚltimoAgente = "ask_clarification":
    - "ver" → search_agent
    - "explorar" → search_agent
    - "agregar" → cart_agent
    - "comprar" → cart_agent
    - "no sé" → search_agent (evitar segundo loop de clarificación)

    ÚltimoAgente = "cart_agent":
    - "también quiero ${productExample2}" → cart_agent
    - "mejor muestra otras" → search_agent
    - "ok listo" → cart_agent (confirmar)

    ## CLARIFICACIÓN

    Asistente: "¿Quieres ver ${vocab.productPlural} o agregar a tu ${vocab.orderWord}?"
    Usuario: "Ver" → search_agent
    Usuario: "Agregar" → cart_agent
    Usuario: "No sé, no estoy seguro" → search_agent (evitar loops)
    Usuario: "Ambos" / "Cualquiera" → search_agent (primero explora)

    ## OUTPUT

    Responde ÚNICAMENTE: "search_agent", "cart_agent" o "ask_clarification"
`.trim();
}

export const routerAgent = async (
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
): Promise<RouterOutput> => {
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;
  const history =
    (await cacheAdapter.getObj<RoutingHistoryEntry[]>(ROUTING_HISTORY_KEY)) ||
    [];
  const historyContext = await getFormattedHistory(history);
  const systemPrompt = createRouterAgentPrompt(domain, historyContext);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory ?? []),
    { role: "user", content: userMessage },
  ];

  const response = await aiAdapter.generateText({
    messages,
    temperature: 0,
    max_tokens: 2_048,
    response_format: {
      type: "json_schema",
      json_schema: {
        type: "string",
        enum: ["search_agent", "cart_agent", "ask_clarification"],
      },
    },
  });

  const result = validateRouter(response);

  // Guardar en el historial con ventana deslizante
  const newEntry: RoutingHistoryEntry = {
    agent: result,
    timestamp: Date.now(),
    userMessage: userMessage.substring(0, 100),
  };
  const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY_LENGTH);
  await cacheAdapter.save(ROUTING_HISTORY_KEY, updatedHistory);

  return result;
};

/**
 * Obtiene el historial completo formateado para el prompt
 */
const getFormattedHistory = async (
  history: RoutingHistoryEntry[],
): Promise<string> => {
  //
  if (history.length === 0) {
    return "null (primer mensaje)";
  }

  // Calcular métricas para ayudar al LLM
  const consecutiveClarifications = history.reduce((acc, entry, idx) => {
    if (entry.agent === "ask_clarification") {
      const prev = history[idx - 1];
      if (!prev || prev.agent === "ask_clarification") {
        return acc + 1;
      }
    }
    return acc;
  }, 0);

  const lastAgent = history[0].agent;
  const lastMessage = history[0].userMessage;
  const timeAgo = Math.floor((Date.now() - history[0].timestamp) / 1000);

  // Mostrar últimos 3 routings
  const recentHistory = history
    .slice(0, 3)
    .map((entry, idx) => {
      const timeAgo = Math.floor((Date.now() - entry.timestamp) / 1000);
      return `${idx + 1}. [${timeAgo}s atrás] ${entry.agent} ← "${entry.userMessage}"`;
    })
    .join("\n    ");

  return `
    ÚltimoAgente: ${lastAgent} (${timeAgo}s atrás) ← "${lastMessage}"
    ClarificacionesConsecutivas: ${consecutiveClarifications}

    HistorialReciente:
    ${recentHistory}
  `.trim();
};

/**
 * Resetea el historial de routing cuando el flujo termina
 * (ej: después de confirmar un pedido, cancelar, o sesión nueva)
 */
export const resetRouterHistory = async (): Promise<void> => {
  await cacheAdapter.delete(ROUTING_HISTORY_KEY);
};

export const clarifierAgent = async (
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
): Promise<BookingSagaResult> => {
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;
  const vocab = DOMAIN_VOCABULARY[domain];
  const productExample1 = vocab.productExamples[0];
  const productExample2 = vocab.productExamples[1] || productExample1;
  const productExample3 = vocab.productExamples[2] || productExample1;

  const systemPrompt = `
    Eres un asistente de clarificación para un ${vocab.greetingContext}. Tu única función es hacer preguntas cortas y amables para entender qué quiere el usuario.

    ## CONTEXTO
    El usuario envió un mensaje ambiguo (ej: "${productExample1}", "${productExample2}") y no sabemos si quiere:
    1. **BUSCAR/EXPLORAR** ${vocab.productPlural} (ver el ${vocab.menuWord}, preguntar qué hay)
    2. **GESTIONAR SU ${vocab.orderWord}** (agregar, quitar, modificar, ver, confirmar)

    ## TU OBJETIVO
    Hacer **UNA sola pregunta corta** que ayude al usuario a clarificar su intención para que el router pueda derivar correctamente.

    ## REGLAS

    1. **SÉ BREVE**: Máximo 1-2 oraciones
    2. **OFRECE LAS 2 OPCIONES**: ¿Quiere ver ${vocab.productPlural}? ¿O gestionar su ${vocab.orderWord}?
    3. **USA PALABRAS CLAVE**: Usa "ver", "ver el menú", "agregar", "gestionar" (el router las reconoce)
    4. **NO ASUMAS**: No asumas que quiere buscar o agregar
    5. **USA EL CONTEXTO**: Si ya vio ${vocab.productPlural}, pregunta si quiere agregar al ${vocab.orderWord}
    6. **EVITA AMBIGÜEDAD**: No preguntes "¿quieres hacer algo?" (demasiado vago)

    ## EJEMPLOS

    Usuario: "${productExample3}"
    → "¿Quieres ver qué ${productExample3} tenemos o quieres gestionar tu ${vocab.orderWord} (agregar, quitar, etc.)?"

    Usuario: "${productExample2}"
    → "¿Quieres ver el ${vocab.menuWord} de ${productExample2} o quieres agregar una ${productExample2} a tu ${vocab.orderWord}?"

    Usuario: "Quiero eso" (después de ver ${vocab.productPlural})
    → "¿Quieres agregar ${vocab.productName} a tu ${vocab.orderWord}?"

    Usuario: "Ver" (ambiguo)
    → "¿Quieres ver el ${vocab.menuWord} o quieres ver lo que ya tienes en tu ${vocab.orderWord}?"

    ## OUTPUT
    Responde ÚNICAMENTE con tu pregunta de clarificación. Nada más.
  `.trim();

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory ?? []),
    { role: "user", content: userMessage },
  ];

  const response = await aiAdapter.generateText({
    messages,
    useAuxModel: true,
    temperature: 0,
  });

  return formatSagaOutput(response, "clarifier agent", { systemPrompt });
};
