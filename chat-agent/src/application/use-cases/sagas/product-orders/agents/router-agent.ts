import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import z from "zod";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { DomainCtx } from "@/domain/booking";
import { productOrderStateManager } from "@/application/services/state-managers";

const routerSchema = z.enum([
  "search_agent",
  "cart_agent",
  "ask_clarification",
  "ask_final_confirmation",
]);

export type RouterOutput = z.infer<typeof routerSchema>;

/**
 * Historial de routing con ventana deslizante (últimos 5 eventos)
 */
export type RoutingHistoryEntry = {
  timestamp: number;
  userMessage: string;
  agent: RouterOutput;
  toolName?: string;
  action?: string; // Para tracking de acciones del cart_agent (add, remove, view, confirm)
};

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
    )
    .replace(
      /^(ask_final_confirmation|final_confirmation|confirmar|finalizar|listo|nada_mas|eso_es_todo).*$/,
      "ask_final_confirmation",
    );

  const result = routerSchema.safeParse(normalized);

  // Fallback defensivo: si no es "cart_agent", "ask_clarification" o "ask_final_confirmation", default a "ask_clarification"
  if (!result.success) {
    console.warn(
      `Router validation failed for: "${raw}" → defaulting to "ask_clarification"`,
    );
    return "ask_clarification";
  }

  return result.data;
};

/**
 * Obtiene el historial completo formateado para el prompt
 */
function createHistoryCtx(history: RoutingHistoryEntry[]): string {
  //
  if (history.length === 0) {
    return "null (primer mensaje)";
  }

  // Calcular métricas para ayudar al LLM
  const consecutiveClarifications: number = history.reduce(
    (acc, entry, idx) => {
      if (entry.agent === "ask_clarification") {
        const prev = history[idx - 1];
        if (!prev || prev.agent === "ask_clarification") {
          return acc + 1;
        }
      }
      return acc;
    },
    0,
  );

  // Verificar si hubo un "add" reciente (necesario para ask_final_confirmation)
  const hasRecentAdd = history.some(
    (entry) => entry.agent === "cart_agent" && entry.action === "add",
  );

  const lastAgent = history[0].agent;
  const lastToolCalled = history[0].toolName;
  const timeAgo = Math.floor((Date.now() - history[0].timestamp) / 1000);

  // Mostrar últimos 3 routings
  const recentHistory = history
    .slice(0, 3)
    .map((entry, idx) => {
      const timeAgo = Math.floor((Date.now() - entry.timestamp) / 1000);
      const actionInfo = entry.action ? ` [${entry.action}]` : "";
      return `${idx + 1}. [${timeAgo}s atrás] ${entry.agent}${actionInfo} ← "${entry.userMessage}"`;
    })
    .join("\n    ");

  return `
      ÚltimoAgente: ${lastAgent} (${timeAgo}s atrás)
      lastToolCalled: ${lastToolCalled}
      HuboAgregadoReciente: ${hasRecentAdd ? "SÍ (se puede confirmar)" : "NO (primero debe agregar)"}

      ClarificacionesConsecutivas: ${consecutiveClarifications}

      HistorialReciente:
      ${recentHistory}
    `.trim();
}

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
    **Cuándo:** El usuario quiere agregar, quitar o modificar ${vocab.productPlural} de su ${vocab.orderWord},
      o dar su nombre para confirmar. También cuando menciona cantidades de ${vocab.productPlural} (ej: "2 ${productExample1}s", "una ${productExample2}").
    **Frases:** "agrega 1 ...", "quiero 2 ...", "cambia este plato por ...", "quitame ...", "mi nombre es...", "2 ${productExample1}s"

    ### ask_clarification
    **Cuándo:** Mensaje corto/vago sin contexto. Producto suelto sin verbo de acción.
    **Frases:** "${productExample1}" (solo), "${productExample2}s" (sin contexto)

    ### ask_final_confirmation
    **Cuándo:** El usuario quiere ver/mostrar su ${vocab.orderWord}, confirmar/finalizar su ${vocab.orderWord}, o indica que ya terminó de agregar.
    **Frases:** "mostrame mi ${vocab.orderWord}", "ver mi ${vocab.orderWord}", "¿qué llevo?", "nada más", "eso es todo", "quiero confirmar", "finalizar", "quiero terminar", "confirmo mi ${vocab.orderWord}", "cómo termino la orden?"

    ## REGLAS

    Historial de routing:
    ${historyContext || "null (primer mensaje)"}

    1. **Patrones de acción:**
      - "agrega", "pon", "dame", "quita", "saca" → cart_agent
      - "quiero ver", "busco", "¿qué tienen?" → search_agent
      - "mi nombre es", "soy" → cart_agent
      - "mostrame mi ${vocab.orderWord}", "ver mi ${vocab.orderWord}", "¿qué llevo?" → ask_final_confirmation
      - "nada más", "eso es todo", "quiero confirmar", "finalizar" → ask_final_confirmation
      - ${vocab.productName} solo (sin verbo) → ask_clarification

    2. **CONDICIÓN CRÍTICA para ask_final_confirmation:**
      - SOLO elige "ask_final_confirmation" si "HuboAgregadoReciente: SÍ"
      - Si "HuboAgregadoReciente: NO" y usuario dice "nada más", "eso es todo" → cart_agent (para que haga view y muestre carrito vacío o pida agregar)
      - El usuario debe haber agregado al menos 1 producto antes de confirmar

    3. **Analiza el historial:**
      - Si "ÚltimoAgente" = "search_agent" y dice "esa", "esa quiero", "la quiero" → cart_agent
      - Si "ÚltimoAgente" = "ask_clarification" y responde "ver" / "explorar" → search_agent
      - Si "ÚltimoAgente" = "ask_clarification" y responde "agregar" / "comprar" → cart_agent
      - Si historial vacío y dice "${productExample1}" → ask_clarification

    4. **Evitar loops (CRÍTICO):**
      - Si "ClarificacionesConsecutivas" >= 2 → elige search_agent (rompe el loop)
      - Si "ClarificacionesConsecutivas" = 1 y usuario sigue ambiguo → search_agent
      - Máximo 1 clarificación por flujo

    5. **Patrones comunes de flujo:**
      - search_agent → cart_agent (flujo normal: explora luego compra)
      - ask_clarification → search_agent → cart_agent (flujo con clarificación)
      - cart_agent[add] → cart_agent[add] → ask_final_confirmation (flujo con confirmación)
      - cart_agent → cart_agent (modificaciones sucesivas)

    6. **Intención clara:**
      - "Quiero una ${productExample1}" → search_agent (primero busca)
      - "Agrega una ${productExample1}" → cart_agent
      - "quiero 1 ${productExample2}" → cart_agent (implícito: agregar)
      - "necesito 1 ${productExample2}" → cart_agent (implícito: agregar)
      - "2 ${productExample1}s" → cart_agent
      - "${productExample1}" (solo) → ask_clarification (o search_agent si "ÚltimoAgente" = search_agent)

    7. **Default:** Si hay duda → ask_clarification (EXCEPTO si "ClarificacionesConsecutivas" >= 2 → search_agent)

    ## EJEMPLOS

    "Quiero ver el ${vocab.menuWord}" → search_agent
    "¿Qué ${vocab.productPlural} tienen?" → search_agent
    "Agregame 2 ${productExample1}s" → cart_agent [add]
    "1 ${productExample2}" → cart_agent [add]
    "Quitame ${productExample1}" → cart_agent [remove]
    "Mostrame mi ${vocab.orderWord}" → ask_final_confirmation [view]
    "¿Qué llevo?" → ask_final_confirmation [view]
    "${productExample1}" → ask_clarification
    "Mi nombre es César" → cart_agent [enterUsername]
    "Confirmo mi ${vocab.orderWord}" → ask_final_confirmation [confirm]

    Si HuboAgregadoReciente: SÍ:
      "Nada más, eso es todo" → ask_final_confirmation
      "Listo, quiero confirmar" → ask_final_confirmation
      "Es todo por ahora" → ask_final_confirmation

    Si HuboAgregadoReciente: NO:
      "Nada más" → cart_agent (para hacer view y mostrar carrito vacío)
      "Eso es todo" → cart_agent (para hacer view y mostrar carrito vacío)

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
    - "ok listo", "nada más", "mostrame mi ${vocab.orderWord}" → ask_final_confirmation

    ## CLARIFICACIÓN

    Asistente: "¿Quieres ver ${vocab.productPlural} o agregar a tu ${vocab.orderWord}?"
    Usuario: "Ver" → search_agent
    Usuario: "Agregar" → cart_agent
    Usuario: "No sé, no estoy seguro" → search_agent (evitar loops)
    Usuario: "Ambos" / "Cualquiera" → search_agent (primero explora)

    ## OUTPUT

    Responde ÚNICAMENTE: "search_agent", "cart_agent", "ask_clarification" o "ask_final_confirmation"
`.trim();
}

export const routerAgent = async (
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
): Promise<RouterOutput> => {
  //
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;
  const routerHistory = await productOrderStateManager.getRouterHistory(
    ctx.productOrderKey,
  );
  const systemPrompt = createRouterAgentPrompt(
    domain,
    createHistoryCtx(routerHistory),
  );

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory ?? []),
    { role: "user", content: userMessage },
  ];

  const response = await aiAdapter.generateText({
    messages,
    temperature: 0,
    max_tokens: 4_096,
    response_format: {
      type: "json_schema",
      json_schema: {
        type: "string",
        enum: [
          "search_agent",
          "cart_agent",
          "ask_clarification",
          "ask_final_confirmation",
        ] satisfies RouterOutput[],
      },
    },
  });

  return validateRouter(response);
};
