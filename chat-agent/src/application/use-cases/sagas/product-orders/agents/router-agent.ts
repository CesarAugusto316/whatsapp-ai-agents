import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { DOMAIN_VOCABULARY } from "./domain-vocabulary";
import z from "zod";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import { DomainCtx } from "@/domain/booking";

const routerSchema = z.enum(["search", "cart"]);

type RouterOutput = z.infer<typeof routerSchema>;

/**
 * Normaliza y valida el output del router
 *
 * El LLM puede retornar: "search", "cart", "search.", "Cart", " SEARCH ", etc.
 * Esta función normaliza antes de validar y hace fallback a "search" si falla
 */
const validateRouter = (raw: string): RouterOutput => {
  // Normalizar: lowercase, trim, sacar puntuación y quotes
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/["'.!¡¿?]/g, "")
    .replace(/^(search|cart).*$/, "$1"); // extraer solo la palabra clave

  const result = routerSchema.safeParse(normalized);

  // Fallback defensivo: si no es "cart", default a "search"
  if (!result.success) {
    console.warn(
      `Router validation failed for: "${raw}" → defaulting to "search"`,
    );
    return "search";
  }

  return result.data;
};

function createRouterAgentPrompt(domain: SpecializedDomain): string {
  const vocab = DOMAIN_VOCABULARY[domain];

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
    - "¿Tienen pizzas?"
    - "¿Qué postres hay?"
    - "Muéstrame el ${vocab.menuWord}"
    - "Envíame la carta"
    - "Quiero una pizza"
    - "Busco algo con pollo"
    - "¿Qué me recomiendan?"
    - "¿Tienen opciones vegetarianas?"

    ### 2. AGENTE DE CARRITO (cart_agent)
    **Cuándo derivar aquí:**
    - El usuario quiere **agregar** ${vocab.productPlural} a su ${vocab.orderWord}
    - El usuario quiere **quitar/eliminar** ${vocab.productPlural} de su ${vocab.orderWord}
    - El usuario quiere **modificar** cantidades de su ${vocab.orderWord}
    - El usuario quiere **ver** qué lleva en su ${vocab.orderWord}/carrito
    - El usuario quiere **confirmar/finalizar** su ${vocab.orderWord}

    **Frases típicas → cart_agent:**
    - "Agregame 2 pizzas"
    - "Quiero agregar esto a mi ${vocab.orderWord}"
    - "Poneme una ensalada"
    - "Quitame la pizza"
    - "Sacame 2 cervezas"
    - "Eliminamelo"
    - "Cambiame a 3 en vez de 2"
    - "Mostrame mi ${vocab.orderWord}"
    - "¿Qué llevo en el carrito?"
    - "Ver carrito"
    - "Confirmo"
    - "Listo, eso es todo"
    - "Finalizar ${vocab.orderWord}"

    ## TU DECISIÓN

    Solo tenés 2 opciones de output:

    **"search"** → Cuando el usuario quiere explorar, buscar, preguntar sobre ${vocab.productPlural}

    **"cart"** → Cuando el usuario quiere gestionar su ${vocab.orderWord} (agregar, quitar, ver, confirmar)

    ## REGLAS DE ORO

    1. **BUSCA PATRONES DE ACCIÓN**:
      - "agrega", "poné", "quiero agregar" → cart
      - "quitá", "sacá", "eliminà" → cart
      - "mostrame mi", "ver carrito", "confirmo" → cart
      - "quiero ver", "busco", "¿qué tienen?" → search

    2. **CUANDO HAY AMBIGÜEDAD**:
      - "Quiero una pizza" → search (primero busca, luego agrega)
      - "Agregame una pizza" → cart (ya sabe qué quiere)
      - "¿Tienen pizzas?" → search (está explorando)
      - "Dame una pizza" → cart (está pidiendo agregar)
      - "2 pastas" → cart (está pidiendo agregar)
      - "Si, dale" → cart (está confirmando) -> cart

    3. **CONTEXTO IMPORTA**:
      - Si el usuario ya está en proceso de ${vocab.actionVerbInfinitive} y dice "agregame" → cart
      - Si el usuario recién empieza y dice "quiero ver" → search

    4. **NO INVENTES**: Solo respondé "search" o "cart"

    5. **DEFAULT EN CASO DE DUDA**:
      - Si no estás seguro de la intención → "search"
      - Si el usuario parece estar continuando una conversación sin acción clara → "search"
      - Mejor derivar a búsqueda que asumir mal una acción de carrito

    ## EJEMPLOS

    Usuario: "Quiero ver el ${vocab.menuWord}"
    → search

    Usuario: "¿Qué postres tienen?"
    → search

    Usuario: "Busco pizzas"
    → search

    Usuario: "Agregame 2 pizzas"
    → cart

    Usuario: "Poneme una ensalada césar"
    → cart

    Usuario: "Quitame la pizza"
    → cart

    Usuario: "Mostrame mi ${vocab.orderWord}"
    → cart

    Usuario: "Sí, confirmado"
    → cart

    Usuario: "¿Tienen opciones vegetarianas?"
    → search

    Usuario: "Quiero una pizza margherita"
    → search (primero busca para ver si tienen)

    Usuario: "Dame esa pizza"
    → cart (ya vio la pizza, ahora la agrega)

    ## OUTPUT

    Respondé ÚNICAMENTE con una palabra:
    - "search" → para derivar al Agente de Búsqueda
    - "cart" → para derivar al Agente de Carrito

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
