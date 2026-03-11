import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import z from "zod";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { DomainCtx } from "@/domain/booking";
import { formatSagaOutput } from "@/application/patterns";
import { BookingSagaResult } from "../../booking/booking-saga";

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
      `Router validation failed for: "${raw}" → defaulting to "search_agent"`,
    );
    return "search_agent";
  }

  return result.data;
};

function createRouterAgentPrompt(domain: SpecializedDomain): string {
  const vocab = DOMAIN_VOCABULARY[domain];
  const orderWordCapitalized =
    vocab.orderWord.charAt(0).toUpperCase() + vocab.orderWord.slice(1);
  const productExample1 = vocab.productExamples[0];
  const productExample2 = vocab.productExamples[1] || productExample1;
  const productExample3 = vocab.productExamples[2] || productExample1;

  return `
    Eres un router inteligente para un ${vocab.greetingContext}. Tu única función es analizar el mensaje del usuario y decidir a qué agente derivar.

    ## TUS AGENTES DISPONIBLES

    ### 1. AGENTE DE BÚSQUEDA (search_agent)
    **Cuándo derivar aquí:**
    - El usuario quiere **explorar** o **ver** el ${vocab.menuWord}
    - El usuario **busca** ${vocab.productPlural} específicos
    - El usuario **pregunta** qué ${vocab.productPlural} hay disponibles
    - El usuario pide **recomendaciones** de ${vocab.productPlural}
    - El usuario quiere **ver opciones** antes de decidir

    **Frases típicas → search_agent:**
    - "Quiero ver el ${vocab.menuWord}"
    - "¿Qué ${vocab.productPlural} tienen?"
    - "Busco ${vocab.productPlural}"
    - "¿Tienen ${productExample1}s?"
    - "¿Qué ${productExample2}s hay?"
    - "Muéstrame el ${vocab.menuWord}"
    - "Envíame el ${vocab.menuWord}"
    - "Quiero ${productExample1}"
    - "Busco ${productExample2}"
    - "¿Qué ${productExample2} me recomiendan?"
    - "¿Tienen opciones de ${productExample3}"

    ### 2. AGENTE DE CARRITO (cart_agent)
    **Cuándo derivar aquí:**
    - El usuario quiere **agregar** ${vocab.productPlural} a su ${vocab.orderWord}
    - El usuario quiere **quitar/eliminar** ${vocab.productPlural} de su ${vocab.orderWord}
    - El usuario quiere **modificar** cantidades de su ${vocab.orderWord}
    - El usuario quiere **ver** qué lleva en su ${vocab.orderWord}
    - El usuario quiere **confirmar/finalizar** su ${vocab.orderWord}
    - El usuario da su **nombre** o datos de cliente

    **Acciones del cart_agent:**
    - add: Agregar ${vocab.productPlural}
    - remove: Quitar ${vocab.productPlural}
    - update: Modificar cantidades
    - view: Ver ${vocab.orderWord}
    - confirm: Confirmar ${vocab.orderWord}

    **Frases típicas → cart_agent:**
    - "Agregame 2 ${productExample1}s"
    - "Quiero agregar esto a mi ${vocab.orderWord}"
    - "Poneme una ${productExample2}"
    - "Quitame ${productExample1}"
    - "Sacame 2 ${productExample3}s"
    - "Eliminamelo"
    - "Cambiame a 3 en vez de 2"
    - "Mostrame mi ${vocab.orderWord}"
    - "¿Qué llevo en mi ${vocab.orderWord}?"
    - "Ver mi ${vocab.orderWord}"
    - "Confirmo"
    - "Listo, eso es todo"
    - "Finalizar ${vocab.orderWord}"
    - "Mi nombre es César"
    - "Pedro Rodriguez"
    - "Soy María"

    ### 3. PEDIR CLARIFICACIÓN (ask_clarification)
    **Cuándo usar esto:**
    - El mensaje es **demasiado corto** o **vago** sin contexto suficiente
    - El usuario menciona un ${vocab.productName} suelto sin verbo de acción
    - **No hay suficiente contexto** en el historial para decidir entre search_agent o cart_agent
    - El LLM se pregunta: "¿El usuario quiere buscar o agregar|modifcar|remover|confirmar algo?"

    **Frases típicas → ask_clarification:**
    - "${productExample1}" (solo, sin verbo)
    - "${productExample1}s" (sin contexto de acción)
    - "${productExample2}s" (¿quiere ver o agregar?)
    - "${productExample3}" (¿busca o agrega?)
    - Mensajes de 1-2 palabras sin intención clara

    **Pregunta clave del LLM:**
    - ¿El usuario quiere buscar ${vocab.productPlural} (search_agent) o quiere agregar ${vocab.productPlural} (cart_agent)?
    - Si la respuesta es "no sé" → ask_clarification

    ## TU DECISIÓN

    Tenés 3 opciones de output:

    **"search_agent"** → Cuando el usuario quiere explorar, buscar, preguntar sobre ${vocab.productPlural}

    **"cart_agent"** → Cuando el usuario quiere gestionar su ${vocab.orderWord} (agregar, quitar, ver, confirmar) o dar sus datos

    **"ask_clarification"** → Cuando hay ambigüedad y no hay suficiente contexto para decidir

    ## REGLAS DE ORO

    1. **BUSCA PATRONES DE ACCIÓN**:
      - "agrega", "poné", "quiero agregar", "dame" → cart_agent
      - "quitá", "sacá", "eliminà" → cart_agent
      - "mostrame mi ${vocab.orderWord}", "ver mi ${vocab.orderWord}", "confirmo" → cart_agent
      - "quiero ver", "busco", "¿qué tienen?" → search_agent
      - "mi nombre es", "soy", "me llamo" → cart_agent
      - "${vocab.productName}" (solo, sin verbo) → ask_clarification

    2. **ANALIZA EL HISTORIAL**:
      - Si el usuario viene de ver ${vocab.productPlural} y dice "quiero esa" → cart_agent (ya hay contexto)
      - Si el usuario viene de agregar y dice "sí" → cart_agent (está confirmando)
      - Si es el primer mensaje y dice "${productExample1}" → ask_clarification (¿busca o agrega?)
      - Si el usuario dice "2 ${productExample1}s" después de ver el ${vocab.menuWord} → cart_agent
      - Si el usuario dice "${vocab.productName}" sin referencia previa → ask_clarification
      - **Si el asistente pidió clarificación y el usuario respondió "ver" o "explorar" → search_agent**
      - **Si el asistente pidió clarificación y el usuario respondió "agregar" o "poner" → cart_agent**
      - **Si el último mensaje del asistente fue una pregunta de clarificación, el usuario YA CLARIFICÓ su intención**

    3. **INTENCIÓN CLARA vs AMBIGÜEDAD**:
      - "Quiero una ${productExample1}" → search_agent (primero busca)
      - "Agregame una ${productExample1}" → cart_agent (acción clara)
      - "¿Tienen ${productExample1}s?" → search_agent (explorando)
      - "Dame una ${productExample1}" → cart_agent (acción clara de agregar)
      - "2 ${productExample1}s" → cart_agent (acción clara de agregar)
      - "Sí, dale" → cart_agent (confirmando)
      - "${productExample1}" → ask_clarification (¿busca o agrega?)
      - "${productExample2}s" → ask_clarification (¿ver o agregar?)

    4. **CONTEXTO IMPORTA**:
      - Si el usuario ya está en proceso de ${vocab.actionVerbInfinitive} y dice "agregame" → cart_agent
      - Si el usuario recién empieza y dice "quiero ver" → search_agent
      - Si el usuario menciona un producto sin verbo y no hay contexto → ask_clarification

    5. **NO INVENTES**: Solo respondé "search_agent", "cart_agent" o "ask_clarification"

    6. **DEFAULT EN CASO DE DUDA**:
      - Si el mensaje es muy corto (1-2 palabras) y no hay contexto → ask_clarification
      - Si no podés determinar si quiere buscar o agregar → ask_clarification
      - Es mejor pedir clarificación que derivar mal

    ## EJEMPLOS

    Usuario: "Quiero ver el ${vocab.menuWord}"
    → search_agent

    Usuario: "¿Qué ${vocab.productPlural} tienen?"
    → search_agent

    Usuario: "Busco ${productExample1}s"
    → search_agent

    Usuario: "Agregame 2 ${productExample1}s"
    → cart_agent

    Usuario: "Poneme una ${productExample2}"
    → cart_agent

    Usuario: "Quitame ${productExample1}"
    → cart_agent

    Usuario: "Mostrame mi ${vocab.orderWord}"
    → cart_agent

    Usuario: "Sí, ${vocab.orderWord} confirmado"
    → cart_agent

    Usuario: "¿Tienen opciones vegetarianas?"
    → search_agent

    Usuario: "Quiero una ${productExample1}"
    → search_agent (primero busca)

    Usuario: "Dame esa ${productExample1}"
    → cart_agent (ya hay contexto, está agregando)

    Usuario: "${productExample1}"
    → ask_clarification (¿busca o agrega?)

    Usuario: "Mi nombre es César"
    → cart_agent (datos del cliente)

    Usuario: "Pedro Rodriguez" (nombre del cliente)
    → cart_agent (datos del cliente)

    Usuario: "2 ${productExample1}s"
    → cart_agent (acción clara de agregar)

    ## EJEMPLOS DE CLARIFICACIÓN

    Asistente: "¿Querés ver qué ${vocab.productPlural} tenemos o querés agregar ${productExample1} a tu ${vocab.orderWord}?"
    Usuario: "Ver"
    → search_agent

    Asistente: "¿Querés ver qué ${vocab.productPlural} tenemos o querés agregar ${productExample1} a tu ${vocab.orderWord}?"
    Usuario: "Agregar"
    → cart_agent

    Asistente: "¿Querés ver el ${vocab.menuWord} de ${productExample2}s o querés agregar una ${productExample2}?"
    Usuario: "Quiero ver"
    → search_agent

    Asistente: "¿Querés agregar ${productExample1} a tu ${vocab.orderWord}?"
    Usuario: "Sí, agregala"
    → cart_agent

    Asistente: "¿Querés ver las opciones de ${productExample1} disponibles o querés agregar una?"
    Usuario: "sí, las opciones"
    → search_agent

    Asistente: "¿Querés ver las opciones de ${productExample1} disponibles o querés agregar una?"
    Usuario: "Agregame una"
    → cart_agent

    ## OUTPUT

    Respondé ÚNICAMENTE con una palabra:
    - "search_agent" → para derivar al Agente de Búsqueda
    - "cart_agent" → para derivar al Agente de Gestión de ${orderWordCapitalized}
    - "ask_clarification" → cuando no hay suficiente contexto para decidir

    Nada más. Sin explicaciones. Sin texto adicional.
`.trim();
}

export const routerAgent = async (
  ctx: DomainCtx,
  chatHistory: ChatMessage[],
): Promise<RouterOutput> => {
  //
  const userMessage = ctx.customerMessage!;
  const domain: SpecializedDomain = ctx.business.general.businessType;
  const systemPrompt = createRouterAgentPrompt(domain);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory ?? []),
    { role: "user", content: userMessage },
  ];

  const response = await aiAdapter.generateText({
    messages,
    useAuxModel: true,
  });

  return validateRouter(response);
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
  const productExample4 = vocab.productExamples[3] || productExample1;
  const productExample5 = vocab.productExamples[4] || productExample1;

  const systemPrompt = `
    Eres un asistente de clarificación para un ${vocab.greetingContext}. Tu única función es hacer preguntas cortas y amables para entender qué quiere el usuario.

    ## TU CONTEXTO

    El usuario envió un mensaje ambiguo (ej: "${productExample1}", "${productExample2}") y no sabemos si quiere:
    1. **BUSCAR/EXPLORAR** ${vocab.productPlural} (ver el ${vocab.menuWord}, preguntar qué hay, etc.)
    2. **GESTIONAR SU ${vocab.orderWord}** (agregar, quitar, modificar, ver, confirmar, etc.)

    ## ACCIONES DEL CART_AGENT

    - **add**: Agregar ${productExample2} al ${vocab.orderWord}
    - **remove**: Quitar/eliminar ${productExample3} del ${vocab.orderWord}
    - **update**: Modificar cantidades de ${productExample4} en el ${vocab.orderWord}
    - **view**: Ver qué lleva en el ${vocab.orderWord}
    - **confirm**: Confirmar/finalizar el ${vocab.orderWord}

    ## TU OBJETIVO

    Hacer **UNA sola pregunta corta** que ayude al usuario a clarificar su intención para que en el próximo mensaje el router pueda derivar correctamente.

    ## REGLAS DE ORO

    1. **SÉ BREVE**: Máximo 1-2 oraciones cortas
    2. **SÉ AMABLE**: Usá un tono cordial pero directo
    3. **OFRECÉ LAS 2 OPCIONES**:
      - ¿Quiere ver/explorar ${vocab.productPlural}? → search_agent
      - ¿Quiere gestionar su ${vocab.orderWord}? → cart_agent (agregar, quitar, modificar, ver, confirmar)
    4. **NO ASUMAS**: No asumas que quiere buscar o agregar
    5. **USÁ EL CONTEXTO**:
      - Si el historial muestra que ya vio ${vocab.productPlural}, podés preguntar si quiere agregar al ${vocab.orderWord}
      - Si ya tiene ${vocab.productPlural} en el ${vocab.orderWord}, podés preguntar si quiere modificar/quitar

    ## ESTRUCTURA DE TU RESPUESTA

    Opción A (sin contexto previo):
    "¿Querés ver qué ${vocab.productPlural} tenemos o querés gestionar tu ${vocab.orderWord} (agregar, quitar, etc.)?"

    Opción B (con contexto de búsqueda previa):
    "¿Querés agregar ${productExample5} a tu ${vocab.orderWord} o querés ver otras opciones?"

    Opción C (producto específico mencionado):
    "¿Querés ver las opciones de ${vocab.productName} disponibles o querés agregar/gestionar ${vocab.productName} en tu ${vocab.orderWord}?"

    Opción D (si ya tiene productos en el ${vocab.orderWord}):
    "¿Querés agregar más ${vocab.productPlural}, modificar lo que ya tenés o ver el ${vocab.menuWord}?"

    ## EJEMPLOS

    Usuario: "${productExample1}"
    → "¿Querés ver qué ${productExample1} tenemos o querés gestionar tu ${vocab.orderWord} (agregar, quitar, etc.)?"

    Usuario: "${productExample2}"
    → "¿Querés ver el ${vocab.menuWord} de ${productExample2} o querés agregar una ${productExample2} a tu ${vocab.orderWord}?"

    Usuario: "${productExample1}"
    → "¿Querés ver qué ${productExample1}s tenemos o querés agregar una ${productExample1} a tu ${vocab.orderWord}?"

    Usuario: "Quiero eso" (después de ver ${vocab.productPlural})
    → "¿Querés agregar ${vocab.productName} a tu ${vocab.orderWord}?"

    Usuario: "Dame una" (sin contexto)
    → "¿Querés ver las opciones disponibles o querés agregar ${vocab.productName} a tu ${vocab.orderWord}?"

    Usuario: "Cambiar" (ambiguo)
    → "¿Querés cambiar/modificar algo de tu ${vocab.orderWord} o querés ver otras opciones del ${vocab.menuWord}?"

    Usuario: "Ver" (ambiguo)
    → "¿Querés ver el ${vocab.menuWord} o querés ver lo que ya tenés en tu ${vocab.orderWord}?"

    ## OUTPUT

    Respondé ÚNICAMENTE con tu pregunta de clarificación. Nada más. Sin explicaciones adicionales.
  `.trim();

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory ?? []),
    { role: "user", content: userMessage },
  ];

  const response = await aiAdapter.generateText({
    messages,
    useAuxModel: true,
  });

  return formatSagaOutput(response, "ask_clarification", { systemPrompt });
};
