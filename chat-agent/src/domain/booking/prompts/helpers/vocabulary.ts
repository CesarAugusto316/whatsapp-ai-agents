import type {
  BookingIntentKey,
  AllDomainKind,
  IntentExampleKey,
  ModuleKind,
  OrderIntentKey,
  ProductIntentKey,
  ProductOrderIntentKey,
} from "@/application/services/pomdp";

/**
 * Obtiene el verbo de acción para un intentKey específico según el dominio.
 *
 * ARQUITECTURA:
 * - Booking verbs: varían por dominio (reservar, agendar, crear cita, etc.)
 * - Product verbs: varían por dominio (ver menú, ver catálogo, etc.)
 * - Order verbs: varían por dominio (hacer pedido de comida, hacer pedido, etc.)
 *
 * EJEMPLOS:
 * - restaurant + booking:create → "Crear reserva"
 * - medical + booking:create → "Agendar cita médica"
 * - real-estate + booking:create → "Agendar visita"
 */
export function getActionVerb(
  key: IntentExampleKey,
  domain: AllDomainKind,
): string {
  // Booking verbs varían por dominio
  const bookingVerbs: Record<string, Record<BookingIntentKey, string>> = {
    restaurant: {
      "booking:create": "Crear reserva",
      "booking:modify": "Modificar reserva",
      "booking:cancel": "Cancelar reserva",
      "booking:check_availability": "Consultar disponibilidad",
    },
    "real-estate": {
      "booking:create": "Agendar visita",
      "booking:modify": "Modificar visita",
      "booking:cancel": "Cancelar visita",
      "booking:check_availability": "Consultar disponibilidad",
    },
    erotic: {
      "booking:create": "Reservar cita",
      "booking:modify": "Modificar cita",
      "booking:cancel": "Cancelar cita",
      "booking:check_availability": "Consultar disponibilidad",
    },
    medical: {
      "booking:create": "Agendar cita médica",
      "booking:modify": "Modificar cita",
      "booking:cancel": "Cancelar cita",
      "booking:check_availability": "Consultar disponibilidad",
    },
  };

  // Product verbs varían por dominio
  const productVerbs: Record<string, Record<ProductIntentKey, string>> = {
    restaurant: {
      "products:view": "Ver menú",
      "products:find": "Buscar platos",
      "products:recommend": "Recomendar platos",
    },
    erotic: {
      "products:view": "Ver catálogo",
      "products:find": "Buscar servicios",
      "products:recommend": "Recomendar servicios",
    },
    retail: {
      "products:view": "Ver catálogo",
      "products:find": "Buscar productos",
      "products:recommend": "Recomendar productos",
    },
  };

  // Order verbs varían por dominio
  const orderVerbs: Record<string, Record<OrderIntentKey, string>> = {
    restaurant: {
      "orders:create": "Hacer pedido de comida",
      "orders:modify": "Modificar pedido",
      "orders:cancel": "Cancelar pedido",
    },
    erotic: {
      "orders:create": "Hacer pedido",
      "orders:modify": "Modificar pedido",
      "orders:cancel": "Cancelar pedido",
    },
    retail: {
      "orders:create": "Hacer pedido",
      "orders:modify": "Modificar pedido",
      "orders:cancel": "Cancelar pedido",
    },
  };

  // Buscar en el diccionario específico del dominio
  if (domain) {
    // @ts-ignore
    const booking = bookingVerbs[domain]?.[key];
    if (booking) return booking;

    // @ts-ignore
    const product = productVerbs[domain]?.[key];
    if (product) return product;

    // @ts-ignore
    const order = orderVerbs[domain]?.[key];
    if (order) return order;
  }

  // Fallback genérico
  const fallbackVerbs: Record<
    BookingIntentKey | ProductOrderIntentKey,
    string
  > = {
    "booking:create": "Crear reserva",
    "booking:modify": "Modificar reserva",
    "booking:cancel": "Cancelar reserva",
    "booking:check_availability": "Consultar disponibilidad",
    "products:view": "Ver productos",
    "products:find": "Buscar productos",
    "products:recommend": "Recomendar productos",
    "orders:create": "Hacer pedido",
    "orders:modify": "Modificar pedido",
    "orders:cancel": "Cancelar pedido",
  };
  return (
    fallbackVerbs[key as BookingIntentKey | ProductOrderIntentKey] ||
    "Gestionar"
  );
}

/**
 * Genera lista de capacidades del negocio según módulos activos.
 * Se usa principalmente en unknown_intent para presentar capacidades al usuario.
 */
export function getDomainCapabilities(params: {
  activeModules: ModuleKind[];
  businessType: AllDomainKind;
}): string {
  const { activeModules, businessType } = params;
  const capabilities: string[] = [];
  let index = 1;

  if (activeModules.includes("booking")) {
    const createVerb = getActionVerb("booking:create", businessType);
    const modifyVerb = getActionVerb("booking:modify", businessType);
    const cancelVerb = getActionVerb("booking:cancel", businessType);
    const checkVerb = getActionVerb("booking:check_availability", businessType);

    capabilities.push(`
     ${index}. RESERVAS:
        - Crear: "${createVerb.toLowerCase()}"
        - Modificar: "${modifyVerb.toLowerCase()}"
        - Cancelar: "${cancelVerb.toLowerCase()}"
        - Consultar: "${checkVerb.toLowerCase()}"`);
    index++;
  }

  if (activeModules.includes("products")) {
    const viewVerb = getActionVerb("products:view", businessType);
    const findVerb = getActionVerb("products:find", businessType);
    const recommendVerb = getActionVerb("products:recommend", businessType);

    capabilities.push(`
     ${index}. PRODUCTOS:
        - Ver: "${viewVerb.toLowerCase()}"
        - Buscar: "${findVerb.toLowerCase()}"
        - Recomendaciones: "${recommendVerb.toLowerCase()}"`);
    index++;
  }

  if (activeModules.includes("orders")) {
    const createVerb = getActionVerb("orders:create", businessType);
    const modifyVerb = getActionVerb("orders:modify", businessType);
    const cancelVerb = getActionVerb("orders:cancel", businessType);

    capabilities.push(`
     ${index}. PEDIDOS:
        - Crear: "${createVerb.toLowerCase()}"
        - Modificar: "${modifyVerb.toLowerCase()}"
        - Cancelar: "${cancelVerb.toLowerCase()}"`);
    index++;
  }

  if (activeModules.includes("delivery")) {
    capabilities.push(`
     ${index}. ENTREGA:
        - Consultar tiempo: "cuánto tarda en llegar"
        - Consultar método: "cómo hacen la entrega"`);
    index++;
  }

  if (activeModules.includes("informational")) {
    capabilities.push(`
     ${index}. INFORMACIÓN:
        - Horarios: "a qué hora abren"
        - Ubicación: "dónde queda el local"
        - Pago: "metodos de pago"
        - Contacto: "cómo los contacto"`);
  }

  return capabilities.join("\n");
}

/**
 * Filtra alternativas excluyendo el intentKey actual.
 * Se usa en ask_clarification, clear_up_uncertainty, propose_alternative.
 */
export function getFilteredAlternatives<T extends { intentKey: string }>(
  alternatives: T[],
  intentKey: string,
): T[] {
  return alternatives.filter((alt) => alt.intentKey !== intentKey);
}
