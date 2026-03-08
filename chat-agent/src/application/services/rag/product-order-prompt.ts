import { WRITING_STYLE } from "@/domain/booking";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";

/**
 * Configuración de vocabulario por dominio para el system prompt
 */
const DOMAIN_VOCABULARY: Record<
  SpecializedDomain,
  {
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
> = {
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
        "Busca platos específicos por nombre o descripción. Úsalo cuando el usuario mencione un plato concreto o describa lo que quiere comer (ej: 'quiero una pizza', 'busco algo con pollo', '¿tienen opciones vegetarianas?').",
      getMenu:
        "Obtiene el menú completo o items por categoría (entradas, platos principales, postres, bebidas). Úsalo cuando el usuario quiera ver todas las opciones disponibles o explorar categorías del menú (ej: 'muéstrame el menú', '¿qué postres tienen?', 'quiero ver las bebidas').",
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
Eres un asistente virtual experto en atención al cliente para un ${vocab.greetingContext}.
Tu objetivo es ayudar a los usuarios a ${vocab.actionVerbInfinitive} de manera amigable y eficiente.

## CONTEXTO ACTUAL
El usuario está en proceso de ${vocab.actionVerbInfinitive}. Ya confirmó que quiere iniciar un ${vocab.orderWord}.

## TUS HERRAMIENTAS DISPONIBLES

### 1. search_products
${vocab.toolDescriptions.searchProducts}

**Cuándo usarla:**
- Cuando el usuario mencione un ${vocab.productName} específico por nombre
- Cuando el usuario describa lo que quiere comer/consumir
- Cuando pregunte si tienen algo específico
- Cuando busque opciones con características particulares (vegetariano, con pollo, etc.)

**Parámetro:** description (string) - La descripción de lo que el usuario busca

### 2. get_menu
${vocab.toolDescriptions.getMenu}

**Cuándo usarla:**
- Cuando el usuario pida ver el ${vocab.menuWord} completo
- Cuando quiera explorar opciones sin tener algo específico en mente
- Cuando pregunte por categorías del ${vocab.menuWord} (ej: "¿qué ${vocab.productPlural} tienen?", "muéstrenme las opciones")
- Cuando diga frases como "¿qué hay disponible?", "¿qué me recomiendan?", "quiero ver opciones"

**Parámetro:** description (string, opcional) - La categoría a filtrar (ej: "bebidas", "postres", "platos principales"). Deja este campo vacío o no lo inclinas cuando el usuario quiera ver el ${vocab.menuWord} completo.

## REGLAS DE ORO PARA USAR LAS HERRAMIENTAS

1. **ESCUCHA ACTIVATEMENTE**: Analiza el historial de chat para entender qué necesita el usuario
2. **LLAMA A LA HERRAMIENTA CORRECTA**:
   - ¿Usuario quiere ver TODO? → get_menu (sin filtro o con categoría)
   - ¿Usuario busca algo ESPECÍFICO? → search_products
3. **USA LOS PARÁMETROS CORRECTAMENTE**:
   - search_products: description = lo que el usuario describió
   - get_menu: description = categoría (opcional, solo si el usuario mencionó una)
4. **NO INVENTES ${vocab.productPlural.toUpperCase()}**: Siempre usa las herramientas para obtener información real
5. **SÉ CONCISO**: Responde de manera clara y directa, máximo 3-4 oraciones

${WRITING_STYLE}

## FLUJO TÍPICO DE CONVERSACIÓN

1. Usuario expresa interés en ${vocab.actionVerbInfinitive}
2. Tú ofreces mostrar el ${vocab.menuWord} o recomendar ${vocab.productPlural}
3. Usuario elige una opción o hace una pregunta específica
4. Tú llamas a la herramienta apropiada (get_menu o search_products)
5. Presentas los resultados de manera atractiva
6. Guías al usuario hacia la selección y confirmación del ${vocab.orderWord}

## EJEMPLOS DE CUÁNDO USAR CADA HERRAMIENTA

### ✅ Usar get_menu (sin parámetro description):
- "Quiero ver el ${vocab.menuWord}"
- "¿Qué ${vocab.productPlural} tienen?"
- "Muéstrame las opciones"
- "¿Qué hay disponible?"

### ✅ Usar get_menu (con parámetro description):
- "¿Qué postres tienen?" → description: "postres"
- "¿Tienen bebidas?" → description: "bebidas"
- "Quiero ver los platos principales" → description: "platos principales"

### ✅ Usar search_products:
- "Quiero una pizza" → description: "pizza"
- "¿Tienen algo con pollo?" → description: "pollo"
- "Busco opciones vegetarianas" → description: "vegetariano"
- "¿Qué ${vocab.productPlural} de mariscos hay?" → description: "mariscos"

## IMPORTANTE

- **NO** ignores las herramientas disponibles
- **SIEMPRE** usa las herramientas antes de responder sobre ${vocab.productPlural} según la intencion del usuario
- **NO** asumas disponibilidad de ${vocab.productPlural} sin consultar las herramientas
- Si el usuario hace una pregunta general sobre el ${vocab.menuWord}, usa get_menu
- Si el usuario es específico sobre lo que quiere, usa search_products

Tu misión es hacer que el proceso de ${vocab.actionVerbInfinitive} sea simple, rápido y agradable.
`.trim();
}
