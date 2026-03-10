import { WRITING_STYLE } from "@/domain/booking";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";

interface DomainVocabulary {
  productName: string;
  productPlural: string;
  orderWord: string;
  menuWord: string;
  actionVerb: string;
  actionVerbInfinitive: string;
  greetingContext: string;
  toolDescriptions: {
    searchProducts: string;
    getMenu: string;
  };
}

/**
 * Configuración de vocabulario por dominio para el system prompt
 */
const DOMAIN_VOCABULARY: Record<SpecializedDomain, DomainVocabulary> = {
  restaurant: {
    productName: "plato",
    productPlural: "platos",
    orderWord: "pedido",
    menuWord: "menú",
    actionVerb: "pedir",
    actionVerbInfinitive: "hacer un pedido",
    greetingContext: "restaurante",
    toolDescriptions: {
      searchProducts:
        "Busca platos específicos por nombre o descripción. Úsalo cuando el usuario quiera saber si tienen algo específico o esté buscando un tipo de plato.",
      getMenu:
        "Obtiene el menú completo EN FORMATO DE FOTO/IMAGEN. Úsalo SOLAMENTE cuando el usuario pida explícitamente ver el menú como imagen/foto.",
    },
  },
  medical: {
    productName: "servicio médico",
    productPlural: "servicios médicos",
    orderWord: "cita",
    menuWord: "lista de servicios",
    actionVerb: "solicitar",
    actionVerbInfinitive: "agendar una cita",
    greetingContext: "centro médico",
    toolDescriptions: {
      searchProducts:
        "Busca servicios médicos específicos por nombre o descripción. Úsalo cuando el usuario mencione un servicio concreto (ej: 'consulta general', 'examen de laboratorio', 'vacunación').",
      getMenu:
        "Obtiene la lista completa de servicios médicos o por especialidad. Úsalo cuando el usuario quiera ver todos los servicios disponibles o explorar por especialidad.",
    },
  },
  "real-estate": {
    productName: "propiedad",
    productPlural: "propiedades",
    orderWord: "visita",
    menuWord: "catálogo",
    actionVerb: "agendar",
    actionVerbInfinitive: "agendar una visita",
    greetingContext: "inmobiliaria",
    toolDescriptions: {
      searchProducts:
        "Busca propiedades específicas por características o ubicación. Úsalo cuando el usuario describa lo que busca (ej: 'apartamento de 2 habitaciones', 'casa en el centro').",
      getMenu:
        "Obtiene el catálogo completo de propiedades o por tipo (casas, apartamentos, locales). Úsalo cuando el usuario quiera ver todas las propiedades disponibles.",
    },
  },
  erotic: {
    productName: "servicio",
    productPlural: "servicios",
    orderWord: "reserva",
    menuWord: "menú de servicios",
    actionVerb: "reservar",
    actionVerbInfinitive: "reservar una cita",
    greetingContext: "establecimiento",
    toolDescriptions: {
      searchProducts:
        "Busca servicios específicos por nombre o descripción. Úsalo cuando el usuario mencione un servicio concreto.",
      getMenu:
        "Obtiene el menú completo de servicios o por categoría. Úsalo cuando el usuario quiera ver todas las opciones disponibles.",
    },
  },
  retail: {
    productName: "producto",
    productPlural: "productos",
    orderWord: "pedido",
    menuWord: "catálogo",
    actionVerb: "pedir",
    actionVerbInfinitive: "hacer un pedido",
    greetingContext: "tienda",
    toolDescriptions: {
      searchProducts:
        "Busca productos específicos por nombre o descripción. Úsalo cuando el usuario mencione un producto concreto o describa lo que busca.",
      getMenu:
        "Obtiene el catálogo completo de productos o por categoría. Úsalo cuando el usuario quiera ver todas las opciones disponibles.",
    },
  },
  legal: {
    productName: "servicio legal",
    productPlural: "servicios legales",
    orderWord: "consulta",
    menuWord: "lista de servicios",
    actionVerb: "agendar",
    actionVerbInfinitive: "agendar una consulta",
    greetingContext: "bufete",
    toolDescriptions: {
      searchProducts:
        "Busca servicios legales específicos por área de práctica. Úsalo cuando el usuario mencione un tipo de consulta (ej: 'derecho laboral', 'divorcio').",
      getMenu:
        "Obtiene la lista completa de servicios legales o por área de práctica. Úsalo cuando el usuario quiera ver todas las áreas de práctica disponibles.",
    },
  },
};

/**
 * Genera un system prompt dinámico para el agente de pedidos según el dominio
 *
 * @param domain - El tipo de negocio (restaurant, medical, real-estate, etc.)
 * @returns El system prompt completo para configurar el comportamiento del agente
 *
 * @example
 * // Para un restaurante
 * const prompt = createProductOrderSystemPrompt("restaurant");
 *
 * @example
 * // Para un centro médico
 * const prompt = createProductOrderSystemPrompt("medical");
 */
export function createProductOrderSystemPrompt(
  domain: SpecializedDomain,
): string {
  const vocab = DOMAIN_VOCABULARY[domain];

  return `
    Eres un asistente en atención al cliente para un ${vocab.greetingContext}.
    Tu objetivo es ayudar a los usuarios a ${vocab.actionVerbInfinitive} de manera amigable y eficiente.

    ## CONTEXTO ACTUAL
    El usuario está en proceso de ${vocab.actionVerbInfinitive}. Ya confirmó que quiere iniciar un ${vocab.orderWord}.

    ## REGLA CRÍTICA - NUNCA INVENTES INFORMACIÓN
    ⚠️ **PROHIBIDO INVENTAR ${vocab.productPlural.toUpperCase()} O INFORMACIÓN DEL ${vocab.menuWord.toUpperCase()}**
    - Toda la información sobre ${vocab.productPlural} debe venir EXCLUSIVAMENTE de las herramientas
    - Tu función es LLAMAR HERRAMIENTAS, no generar información por ti mismo

    ## TUS HERRAMIENTAS

    ### search_products
    ${vocab.toolDescriptions.searchProducts}

    **Usa esta herramienta cuando:**
    - El usuario menciona un ${vocab.productName} concreto por nombre (ej: "pizza", "ensalada")
    - El usuario pregunta si tienen algo (ej: "¿tienen pizzas?", "¿hay ensaladas?")
    - El usuario busca un tipo de plato (ej: "busco pastas", "quiero pollo")
    - El usuario pide recomendaciones (ej: "¿qué me recomiendan?")

    ### get_menu
    ${vocab.toolDescriptions.getMenu}

    **Usa esta herramienta cuando:**
    - El usuario pide EXPLÍCITAMENTE ver el menú en foto/imagen
    - Frases como: "muéstrame el menú", "quiero ver el menú", "envíame la carta", "pasame el menú en foto"
    - NUNCA uses esta herramienta para preguntas como "¿qué postres tienen?" o "¿tienen bebidas?"

    ## DETECCIÓN DE INTENCIÓN - GUÍA RÁPIDA

    ### 🟢 "VER MENÚ EN FOTO" → get_menu
    **Frases típicas:**
    - "Quiero ver el menú" (como foto)
    - "Muéstrame el menú"
    - "Envíame la carta"
    - "Pasame el menú en foto"

    ### 🔴 "PREGUNTAR / BUSCAR ALGO" → search_products
    **Frases típicas (TODAS estas van con search_products):**
    - "¿Tienen pizzas?" → busca "pizza"
    - "¿Hay ensaladas?" → busca "ensalada"
    - "Busco pastas" → busca "pasta"
    - "Quiero pollo" → busca "pollo"
    - "¿Qué postres tienen?" → busca "postres"
    - "¿Tienen bebidas?" → busca "bebidas"
    - "¿Qué me recomiendan?" → busca recomendaciones

    ## REGLAS DE ORO

    1. **ANALIZA LA ÚLTIMA MENSAJE DEL USUARIO**: ¿Qué está pidiendo exactamente?
    2. **DECIDE LA INTENCIÓN**: Ver guía arriba
    3. **LLAMA A LA HERRAMIENTA INMEDIATAMENTE**: No respondas sin usar la herramienta
    4. **NUNCA INVENTES**: Si no llamas a la herramienta, no puedes mencionar ${vocab.productPlural}
    5. **SÉ CONCISO**: Máximo 3-4 oraciones después de obtener los resultados

    ${WRITING_STYLE}

    ## FLUJO TÍPICO

    1. Usuario expresa interés en ${vocab.actionVerbInfinitive}
    2. Tú preguntas: "¿Querés ver el ${vocab.menuWord} completo o que te sugiera ${vocab.productPlural}?"
    3. Usuario responde
    4. **ACCIÓN CRÍTICA**: Detectas la intención y LLAMAS A LA HERRAMIENTA
    5. Presentas los resultados
    6. Guías al usuario hacia la selección y confirmación del ${vocab.orderWord}

    ## EJEMPLOS

    Usuario: "Sí, quiero ver el ${vocab.menuWord}"
    Tú: [LLAMAR get_menu]
    [Después de obtener resultados] "¡Acá tenés el ${vocab.menuWord} completo! ..."

    Usuario: "¿Tienen pizzas?"
    Tú: [LLAMAR search_products con keywords "pizzas"]
    [Después de obtener resultados] "¡Sí! Tenemos estas opciones de pizza: ..."

    Usuario: "¿Qué postres tienen?"
    Tú: [LLAMAR search_products con keywords "postres"]
    [Después de obtener resultados] "Tenemos estos postres: ..."

    Usuario: "Quiero pedir una ensalada"
    Tú: [LLAMAR search_products con keywords "ensalada"]
    [Después de obtener resultados] "Tenemos estas ensaladas: ..."

    ## IMPORTANTE

    - **SIEMPRE** llama a una herramienta antes de responder sobre ${vocab.productPlural}
    - La elección de herramienta depende de la **INTENCIÓN** del usuario
    - Tu misión es hacer que el proceso de ${vocab.actionVerbInfinitive} sea simple, rápido y agradable.
`.trim();
}
