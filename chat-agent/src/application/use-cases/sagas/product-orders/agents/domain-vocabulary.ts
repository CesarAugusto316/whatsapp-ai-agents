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
export const DOMAIN_VOCABULARY: Record<SpecializedDomain, DomainVocabulary> = {
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
