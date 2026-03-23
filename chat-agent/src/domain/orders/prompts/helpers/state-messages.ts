import { formatLocalDateTime } from "@/domain/utilities";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { OrderIntentKey } from "@/application/services/pomdp";
import { OperationMode } from "@/domain";

/**
 * Templates de mensajes determinísticos para transiciones de estado en orders.
 *
 * ARQUITECTURA:
 * - Los mensajes se disparan después de una transición de estado
 * - Cada dominio tiene su propio vocabulario (restaurant, retail, etc.)
 * - Los templates son determinísticos (fácilmente convertibles a prompts en el futuro)
 *
 * EJEMPLOS DE USO:
 * - restaurant + orders:create → "🍽️ Tu pedido de comida..."
 * - retail + orders:create → "🛍️ Tu pedido..."
 */

/**
 * Configuración de verbos y acciones por dominio para orders.
 * Extensible para futuros dominios.
 */
const DOMAIN_ORDER_CONFIG: Record<
  SpecializedDomain,
  Record<
    OperationMode,
    {
      action: string;
      verb: string;
      verbInfinitive: string;
      process: string;
      title: string;
    }
  >
> = {
  // RESTAURANT - dominio principal implementado
  restaurant: {
    create: {
      action: "Hacer pedido de comida",
      verb: "creado",
      verbInfinitive: "hacer",
      process: "creación",
      title: "pedido de comida",
    },
    update: {
      action: "Modificar pedido",
      verb: "actualizado",
      verbInfinitive: "modificar",
      process: "modificación",
      title: "pedido",
    },
    cancel: {
      action: "Cancelar pedido",
      verb: "cancelado",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "pedido",
    },
  },
  // RETAIL - futuro
  retail: {
    create: {
      action: "Hacer pedido",
      verb: "creado",
      verbInfinitive: "hacer",
      process: "creación",
      title: "pedido",
    },
    update: {
      action: "Modificar pedido",
      verb: "actualizado",
      verbInfinitive: "modificar",
      process: "modificación",
      title: "pedido",
    },
    cancel: {
      action: "Cancelar pedido",
      verb: "cancelado",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "pedido",
    },
  },
  // EROTIC - futuro
  erotic: {
    create: {
      action: "Hacer pedido",
      verb: "creado",
      verbInfinitive: "hacer",
      process: "creación",
      title: "pedido",
    },
    update: {
      action: "Modificar pedido",
      verb: "actualizado",
      verbInfinitive: "modificar",
      process: "modificación",
      title: "pedido",
    },
    cancel: {
      action: "Cancelar pedido",
      verb: "cancelado",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "pedido",
    },
  },
  // MEDICAL - no aplica para orders
  medical: {
    create: {
      action: "Agendar servicio",
      verb: "agendado",
      verbInfinitive: "agendar",
      process: "agendamiento",
      title: "servicio",
    },
    update: {
      action: "Modificar servicio",
      verb: "actualizado",
      verbInfinitive: "modificar",
      process: "modificación",
      title: "servicio",
    },
    cancel: {
      action: "Cancelar servicio",
      verb: "cancelado",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "servicio",
    },
  },
  // REAL-ESTATE - no aplica para orders
  "real-estate": {
    create: {
      action: "Agendar trámite",
      verb: "agendado",
      verbInfinitive: "agendar",
      process: "agendamiento",
      title: "trámite",
    },
    update: {
      action: "Modificar trámite",
      verb: "actualizado",
      verbInfinitive: "modificar",
      process: "modificación",
      title: "trámite",
    },
    cancel: {
      action: "Cancelar trámite",
      verb: "cancelado",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "trámite",
    },
  },
  // LEGAL - no aplica para orders
  legal: {
    create: {
      action: "Agendar caso",
      verb: "creado",
      verbInfinitive: "abrir",
      process: "apertura",
      title: "caso",
    },
    update: {
      action: "Modificar caso",
      verb: "actualizado",
      verbInfinitive: "modificar",
      process: "modificación",
      title: "caso",
    },
    cancel: {
      action: "Cancelar caso",
      verb: "cancelado",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "caso",
    },
  },
};

/**
 * Obtiene la configuración de orden para un dominio y modo específicos.
 */
function getOrderConfig(domain: SpecializedDomain, mode: OperationMode) {
  return DOMAIN_ORDER_CONFIG[domain][mode];
}

/**
 * Genera mensaje template para intents de orders.
 *
 * @param intent - El intent de orden (orders:create, orders:modify, orders:cancel)
 * @param config - Configuración con dominio, modo y datos opcionales
 * @returns Mensaje template listo para ser humanizado
 */
export function getOrderMessage(
  intent: OrderIntentKey,
  config: {
    domain: SpecializedDomain;
    mode?: OperationMode;
    data?: {
      orderId?: string;
      items?: Array<{ name: string; quantity: number; price?: number }>;
      total?: number;
      status?: string;
      estimatedTime?: { min: number; max: number; unit: string };
      deliveryAddress?: string;
    };
  },
): string {
  const { domain, mode = "create", data } = config;
  const intentType = intent.split(":")[1] as OperationMode;

  switch (intentType) {
    case "create":
      return getOrderCreateMessage(domain, mode, data);

    case "update":
      return getOrderModifyMessage(domain, data);

    case "cancel":
      return getOrderCancelMessage(domain, data);

    default:
      return "Gestionando tu pedido";
  }
}

/**
 * Mensaje para orders:create
 * Confirma la creación del pedido
 */
function getOrderCreateMessage(
  domain: SpecializedDomain,
  mode: OperationMode,
  data?: {
    orderId?: string;
    items?: Array<{ name: string; quantity: number; price?: number }>;
    total?: number;
    status?: string;
    estimatedTime?: { min: number; max: number; unit: string };
    deliveryAddress?: string;
  },
): string {
  const config = getOrderConfig(domain, mode);

  if (!data?.items || data.items.length === 0) {
    return `
       👋 Para ${config.verbInfinitive} tu ${config.title}, necesito que me digas:
       - Qué ${config.title === "pedido de comida" ? "platos" : "productos"} deseas
       - La cantidad de cada uno

       Por ejemplo:
         "Quiero 2 pizzas y 1 gaseosa"
         "Necesito 3 camisas talla M"
     `.trim();
  }

  const itemsList = data.items
    .map((item) => {
      const price = item.price ? `$${item.price} c/u` : "";
      return `• ${item.quantity}x ${item.name} ${price}`;
    })
    .join("\n");

  const totalMsg = data.total ? `\n\n💰 *Total: $${data.total}*` : "";
  const timeMsg = data.estimatedTime
    ? `\n\n⏱️ Tiempo estimado: ${data.estimatedTime.min}-${data.estimatedTime.max} ${data.estimatedTime.unit}`
    : "";
  const deliveryMsg = data.deliveryAddress
    ? `\n\n📍 Entrega en: ${data.deliveryAddress}`
    : "";

  return `
     ✅ Tu ${config.title} ha sido ${config.verb} con éxito.

     📋 *Detalle del ${config.title}:*
     ${itemsList}${totalMsg}${timeMsg}${deliveryMsg}

     🆔 ID de ${config.title}: ${data.orderId || "N/A"}

     💬 Si necesitas modificar algo, avísame antes de que sea procesado.
   `.trim();
}

/**
 * Mensaje para orders:modify
 * Confirma la modificación del pedido
 */
function getOrderModifyMessage(
  domain: SpecializedDomain,
  data?: {
    orderId?: string;
    items?: Array<{ name: string; quantity: number; price?: number }>;
    total?: number;
    status?: string;
  },
): string {
  const config = getOrderConfig(domain, "update");

  if (!data?.items || data.items.length === 0) {
    return `
       ✨ Para ${config.verbInfinitive} tu ${config.title}, necesito que me digas:
       - Qué cambios deseas hacer
       - Qué ${config.title === "pedido de comida" ? "platos" : "productos"} agregar o quitar

       Por ejemplo:
         "Quiero agregar 1 ensalada más"
         "Necesito quitar la gaseosa"
     `.trim();
  }

  const itemsList = data.items
    .map((item) => {
      const price = item.price ? `$${item.price} c/u` : "";
      return `• ${item.quantity}x ${item.name} ${price}`;
    })
    .join("\n");

  const totalMsg = data.total
    ? `\n\n💰 *Total actualizado: $${data.total}*`
    : "";

  return `
     ✅ Tu ${config.title} ha sido ${config.verb} con éxito.

     📋 *Nuevo detalle del ${config.title}:*
     ${itemsList}${totalMsg}

     🆔 ID de ${config.title}: ${data.orderId || "N/A"}

     💬 Si necesitas otro cambio, avísame antes de que sea procesado.
   `.trim();
}

/**
 * Mensaje para orders:cancel
 * Confirma la cancelación del pedido
 */
function getOrderCancelMessage(
  domain: SpecializedDomain,
  data?: {
    orderId?: string;
    status?: string;
  },
): string {
  const config = getOrderConfig(domain, "cancel");

  return `
     ❌ Tu ${config.title} ha sido ${config.verb} con éxito.

     🆔 ID de ${config.title}: ${data?.orderId || "N/A"}
     📋 Estado: ${data?.status || "Cancelado"}

     💬 Si tienes alguna pregunta sobre el reembolso, contáctanos.
   `.trim();
}

/**
 * Mensaje de salida para orders
 */
export function getOrderExitMsg(domain?: SpecializedDomain): string {
  const title = domain ? DOMAIN_ORDER_CONFIG[domain].create.title : "pedido";

  return `
     Gracias por usar nuestro servicio de ${title}s 😊

     Recuerda que puedes:
     1️⃣ ${DOMAIN_ORDER_CONFIG[domain || "restaurant"].create.action}
     2️⃣ ${DOMAIN_ORDER_CONFIG[domain || "restaurant"].update.action} ó
     3️⃣ ${DOMAIN_ORDER_CONFIG[domain || "restaurant"].cancel.action}

     💬 Si tienes otra pregunta, escríbela directamente.
   `.trim();
}
