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

function createRouterAgentPrompt2(domain: SpecializedDomain): string {
  const vocab = DOMAIN_VOCABULARY[domain];
  const product1 = vocab.productExamples[0];
  const product2 = vocab.productExamples[1] || product1;

  return `
    Eres un clasificador de intenciones. Tu única tarea es mapear el input del usuario a un agente.

    ## INPUT QUE RECIBES
    - user_message: "${"{{user_message}}"}"
    - last_action: "${"{{last_action}}"}"  // ej: "menu_displayed", "clarification_asked", null
    - has_cart_items: ${"{{has_cart_items}}"}  // boolean

    ## AGENTES (Elige UNO)
    1. search_agent → Usuario quiere explorar, ver ${vocab.menuWord}, buscar ${vocab.productPlural}.
    2. cart_agent → Usuario quiere agregar, quitar, modificar, confirmar ${vocab.orderWord}, o dar datos personales.
    3. ask_clarification → Mensaje ambiguo, producto sin verbo, o información insuficiente.

    ## REGLAS (Prioridad descendente)
    1. Si user_message contiene verbo de acción ("agrega", "quita", "dame", "compro") → cart_agent
    2. Si user_message contiene verbo de exploración ("ver", "buscar", "qué hay") → search_agent
    3. Si user_message es solo un producto ("${product1}") Y last_action != "menu_displayed" → ask_clarification
    4. Si user_message es solo un producto ("${product1}") Y last_action == "menu_displayed" → cart_agent
    5. Default → ask_clarification

    ## OUTPUT (STRICT)
    Responde SOLO con este JSON, sin texto antes ni después:
    {"agent": "search_agent" | "cart_agent" | "ask_clarification"}
`.trim();
}

function createRouterAgentPrompt(
  domain: SpecializedDomain,
  lastAgentRouted?: string,
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

    lastAgentRouted: ${lastAgentRouted}

    1. **Patrones de acción:**
      - "agrega", "pon", "dame", "quita", "saca" → cart_agent
      - "quiero ver", "busco", "¿qué tienen?" → search_agent
      - "mi nombre es", "soy" → cart_agent
      - Producto solo (sin verbo) → ask_clarification

    2. **Historial importa:**
      - Si viene de ver ${vocab.productPlural} y dice "quiero esa" → cart_agent
      - Si es el primer mensaje y dice "${productExample1}" → ask_clarification
      - **Si hubo clarificación y responde "ver" → search_agent, "agregar" → cart_agent**

    3. **Intención clara:**
      - "Quiero una ${productExample1}" → search_agent (primero busca)
      - "Agrega una ${productExample1}" → cart_agent
      - "quiero 1 ${productExample2}" → cart_agent
      - "necesito 1 ${productExample2}" → cart_agent
      - "2 ${productExample1}s" → cart_agent
      - "${productExample1}" (solo) → ask_clarification

    4. **Default:** Si hay duda → ask_clarification

    5. **Evitar loops:** Si YA hubo clarificación y el usuario sigue ambiguo → interpreta a favor de search_agent (primero explora, luego agrega)

    ## EJEMPLOS

    "Quiero ver el ${vocab.menuWord}" → search_agent
    "¿Qué ${vocab.productPlural} tienen?" → search_agent
    "Agregame 2 ${productExample1}s" → cart_agent
    "1 ${productExample2}" → cart_agent
    "Quitame ${productExample1}" → cart_agent
    "Mostrame mi ${vocab.orderWord}" → cart_agent
    "${productExample1}" → ask_clarification
    "Mi nombre es César" → cart_agent

    ## CLARIFICACIÓN

    Asistente: "¿Quieres ver ${vocab.productPlural} o agregar a tu ${vocab.orderWord}?"
    Usuario: "Ver" → search_agent
    Usuario: "Agregar" → cart_agent
    Usuario: "No sé, no estoy seguro" → ask_clarification
    Usuario: "Ambos" / "Cualquiera" → search_agent (primero explora)

    ## OUTPUT

    Responde ÚNICAMENTE: "search_agent", "cart_agent" o "ask_clarification"
`.trim();
}

export const routerAgent = async (
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
): Promise<RouterOutput> => {
  //
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;
  const lastAgentRouted = await cacheAdapter.getStr("routerAgent");
  const systemPrompt = createRouterAgentPrompt(domain, lastAgentRouted);

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
  await cacheAdapter.save("routerAgent", result);

  return result;
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
