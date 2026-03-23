import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { ProductIntentKey } from "@/application/services/pomdp";

/**
 * Templates de mensajes determinísticos para transiciones de estado en products.
 *
 * ARQUITECTURA:
 * - Los mensajes se disparan después de una transición de estado
 * - Cada dominio tiene su propio vocabulario (restaurant, retail, etc.)
 * - Los templates son determinísticos (fácilmente convertibles a prompts en el futuro)
 *
 * EJEMPLOS DE USO:
 * - restaurant + products:view → "📋 Aquí está nuestro menú..."
 * - retail + products:view → "🛍️ Aquí está nuestro catálogo..."
 */

/**
 * Configuración de verbos y acciones por dominio para products.
 * Extensible para futuros dominios.
 */
const DOMAIN_PRODUCT_CONFIG: Record<SpecializedDomain, {
  view: {
    verb: string;
    title: string;
    welcomeMsg: string;
  };
  find: {
    verb: string;
    title: string;
    welcomeMsg: string;
  };
  recommend: {
    verb: string;
    title: string;
    welcomeMsg: string;
  };
}> = {
  // RESTAURANT - dominio principal implementado
  restaurant: {
    view: {
      verb: "Ver menú",
      title: "menú",
      welcomeMsg: "📋 Aquí está nuestro menú",
    },
    find: {
      verb: "Buscar platos",
      title: "plato",
      welcomeMsg: "🔍 Buscando platos",
    },
    recommend: {
      verb: "Recomendar platos",
      title: "plato",
      welcomeMsg: "⭐ Te recomiendo estos platos",
    },
  },
  // RETAIL - futuro
  retail: {
    view: {
      verb: "Ver catálogo",
      title: "catálogo",
      welcomeMsg: "🛍️ Aquí está nuestro catálogo",
    },
    find: {
      verb: "Buscar productos",
      title: "producto",
      welcomeMsg: "🔍 Buscando productos",
    },
    recommend: {
      verb: "Recomendar productos",
      title: "producto",
      welcomeMsg: "⭐ Te recomiendo estos productos",
    },
  },
  // EROTIC - futuro
  erotic: {
    view: {
      verb: "Ver catálogo",
      title: "catálogo",
      welcomeMsg: "📖 Aquí está nuestro catálogo de servicios",
    },
    find: {
      verb: "Buscar servicios",
      title: "servicio",
      welcomeMsg: "🔍 Buscando servicios",
    },
    recommend: {
      verb: "Recomendar servicios",
      title: "servicio",
      welcomeMsg: "⭐ Te recomiendo estos servicios",
    },
  },
  // MEDICAL - no aplica para products
  medical: {
    view: {
      verb: "Ver servicios",
      title: "servicio",
      welcomeMsg: "📋 Aquí está nuestra lista de servicios",
    },
    find: {
      verb: "Buscar servicios",
      title: "servicio",
      welcomeMsg: "🔍 Buscando servicios",
    },
    recommend: {
      verb: "Recomendar servicios",
      title: "servicio",
      welcomeMsg: "⭐ Te recomiendo estos servicios",
    },
  },
  // REAL-ESTATE - no aplica para products
  "real-estate": {
    view: {
      verb: "Ver propiedades",
      title: "propiedad",
      welcomeMsg: "🏠 Aquí está nuestra lista de propiedades",
    },
    find: {
      verb: "Buscar propiedades",
      title: "propiedad",
      welcomeMsg: "🔍 Buscando propiedades",
    },
    recommend: {
      verb: "Recomendar propiedades",
      title: "propiedad",
      welcomeMsg: "⭐ Te recomiendo estas propiedades",
    },
  },
  // LEGAL - no aplica para products
  legal: {
    view: {
      verb: "Ver servicios",
      title: "servicio",
      welcomeMsg: "⚖️ Aquí está nuestra lista de servicios legales",
    },
    find: {
      verb: "Buscar servicios",
      title: "servicio",
      welcomeMsg: "🔍 Buscando servicios legales",
    },
    recommend: {
      verb: "Recomendar servicios",
      title: "servicio",
      welcomeMsg: "⭐ Te recomiendo estos servicios legales",
    },
  },
};

/**
 * Obtiene la configuración de producto para un dominio específico.
 */
function getProductConfig(domain: SpecializedDomain, intent: ProductIntentKey) {
  const intentType = intent.split(":")[1] as "view" | "find" | "recommend";
  return DOMAIN_PRODUCT_CONFIG[domain][intentType];
}

/**
 * Genera mensaje template para intents de products.
 *
 * @param intent - El intent de producto (products:view, products:find, products:recommend)
 * @param config - Configuración con dominio y datos opcionales
 * @returns Mensaje template listo para ser humanizado
 */
export function getProductMessage(
  intent: ProductIntentKey,
  config: {
    domain: SpecializedDomain;
    query?: string;
    items?: Array<{ name: string; description?: string; price?: number }>;
  }
): string {
  const { domain, query, items = [] } = config;
  const productConfig = getProductConfig(domain, intent);
  const intentType = intent.split(":")[1] as "view" | "find" | "recommend";

  switch (intentType) {
    case "view":
      return getViewMessage(productConfig, items);

    case "find":
      return getFindMessage(productConfig, query || "", items);

    case "recommend":
      return getRecommendMessage(productConfig, items);

    default:
      return productConfig.welcomeMsg;
  }
}

/**
 * Mensaje para products:view
 * Muestra el menú o catálogo completo
 */
function getViewMessage(
  config: { title: string; welcomeMsg: string },
  items: Array<{ name: string; description?: string; price?: number }>
): string {
  if (items.length === 0) {
    return `
       😕 Lo sentimos, no hay ${config.title.toLowerCase()}s disponibles en este momento.

       Por favor intenta más tarde o consulta con nuestro personal.
     `.trim();
  }

  const itemsList = items
    .map((item, index) => {
      const price = item.price ? `$${item.price}` : "";
      return `${index + 1}. *${item.name}* ${price}\n   ${item.description || ""}`;
    })
    .join("\n\n");

  return `
     ${config.welcomeMsg}:

     ${itemsList}

     💬 Si tienes alguna pregunta sobre algún ${config.title.toLowerCase()}, escríbela directamente.
   `.trim();
}

/**
 * Mensaje para products:find
 * Muestra resultados de búsqueda
 */
function getFindMessage(
  config: { title: string; welcomeMsg: string },
  query: string,
  items: Array<{ name: string; description?: string; price?: number }>
): string {
  if (items.length === 0) {
    return `
       😕 No encontramos ${config.title.toLowerCase()}s que coincidan con "*${query}*".

       Intenta con otra búsqueda o consulta nuestro ${config.title.toLowerCase()} completo.
     `.trim();
  }

  const itemsList = items
    .map((item, index) => {
      const price = item.price ? `$${item.price}` : "";
      return `${index + 1}. *${item.name}* ${price}\n   ${item.description || ""}`;
    })
    .join("\n\n");

  return `
     ${config.welcomeMsg} para "*${query}*":

     ${itemsList}

     💬 Si necesitas más información, escríbela directamente.
   `.trim();
}

/**
 * Mensaje para products:recommend
 * Muestra recomendaciones personalizadas
 */
function getRecommendMessage(
  config: { title: string; welcomeMsg: string },
  items: Array<{ name: string; description?: string; price?: number }>
): string {
  if (items.length === 0) {
    return `
       😕 Lo sentimos, no tenemos ${config.title.toLowerCase()}s para recomendar en este momento.

       Por favor consulta nuestro ${config.title.toLowerCase()} completo.
     `.trim();
  }

  const itemsList = items
    .map((item, index) => {
      const price = item.price ? `$${item.price}` : "";
      return `${index + 1}. *${item.name}* ${price}\n   ${item.description || ""}`;
    })
    .join("\n\n");

  return `
     ${config.welcomeMsg}:

     ${itemsList}

     💬 Si necesitas más información, escríbela directamente.
   `.trim();
}

/**
 * Mensaje de salida para products
 */
export function getProductExitMsg(domain?: SpecializedDomain): string {
  const title = domain ? DOMAIN_PRODUCT_CONFIG[domain].view.title : "productos";

  return `
     Gracias por consultar nuestros ${title}s 😊

     Recuerda que puedes:
     1️⃣ Ver nuestro ${title} completo
     2️⃣ Buscar ${title}s específicos
     3️⃣ Pedir recomendaciones

     💬 Si tienes otra pregunta, escríbela directamente.
   `.trim();
}
