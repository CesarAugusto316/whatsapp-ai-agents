import type {
  BookingIntentKey,
  IntentExample,
  OrderIntentKey,
  ProductIntentKey,
} from "../intent.types";

// ============================================
// 1. INTENTS
// ============================================

/**
 *
 * @todo podría ser importante a futuro distinguir entre
 * preguntas vs sentencias imperativas.
 *
 * Ej. Puedes mostrarme el menú?  -> muestrame el menú
 *     Hay hamburguesas? -> dame el menú/precios de hamburguesas
 *
 */
export const restaurantBooking: IntentExample<BookingIntentKey>[] = [
  {
    intentKey: "booking:create",
    module: "booking",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal (explícito sobre mesas/restaurantes)
      "quiero reservar una mesa",
      "necesito reservar mesa ahora",
      "me gustaría reservar para comer",
      "voy a reservar mesa",
      "quiero apartar mesa para cenar",
      "reservar mesa en el restaurante",

      // España (auténtico y explícito)
      "quiero dejar mesa reservada",
      "puedo reservar mesa para hoy",
      "quiero pillar mesa para cenar",
      "necesito turno para comer",
      "apúntame en la lista del restaurante",
      "reservar mesa para almorzar",

      // Latam (CO/EC/MX)
      "déjame mesa apartada",
      "guarda lugar para comer",
      "aparta mesa para mí",
      "quiero asegurar mesa para cenar",
      "reservar espacio para almorzar",
      "apartar mesa en el restaurante",
    ],
  },
  {
    intentKey: "booking:modify",
    module: "booking",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal (explícito sobre mesa/restaurante)
      "quiero cambiar mi reserva de mesa",
      "necesito modificar la reserva del restaurante",
      "puedo ajustar mi reserva de mesa",
      "quiero reprogramar mi reserva para comer",
      "necesito mover la reserva de mesa",
      "cambiar fecha de la reserva de mesa",

      // España
      "mover la reserva de mesa para otro día",
      "cambiar la fecha de la reserva del restaurante",
      "adelantar la reserva para cenar",
      "atrasar la reserva de mesa",
      "cambiar el horario de la reserva para comer",
      "modificar la hora de la reserva",

      // Latam (CO/EC/MX)
      "correr la reserva de mesa para otra fecha",
      "recorrer la reserva para almorzar",
      "mover la reserva de mesa para otro día",
      "cambiar el día de la reserva del restaurante",
      "ajustar la hora de mi reserva de mesa",
    ],
  },
  {
    intentKey: "booking:cancel",
    module: "booking",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal - verbos explícitos + contexto de mesa
      "quiero cancelar mi reserva de mesa",
      "necesito cancelar la reserva del restaurante",
      "cancelar mi reserva de mesa",
      "anular reserva de mesa",
      "ya no necesito la mesa reservada",

      // España
      "quiero anular la reserva del restaurante",
      "anular mi reserva de mesa",
      "dame de baja la reserva de la mesa",
      "quita mi reserva del restaurante",
      "ya no voy a cenar allí",

      // Latam (CO/EC/MX)
      "desmarca mi reserva de mesa",
      "ya no voy a ir al restaurante",
      "ya no puedo ir a comer",
      "no voy a poder asistir a la reserva",
      "cancela la mesa que aparté",
    ],
  },
  {
    intentKey: "booking:check_availability",
    module: "booking",
    domain: "restaurant",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      // Universal (explícitamente sobre reservas/mesas)
      "hay disponibilidad de mesas",
      "qué horarios tienen libres para reservar",
      "qué días tienen disponibles para reserva",
      "hay mesas disponibles para hoy",
      "puedo reservar para esta noche",
      "tienen huecos para reservar",

      // España (auténtico pero explícito)
      "queda sitio para reservar",
      "tenéis hueco para mesa",
      "tenéis mesas libres hoy",
      "queda alguna mesa disponible",
      "hay disponibilidad para cenar",
      "podéis atenderme esta noche",

      // Latam (CO/EC/MX)
      "queda lugar para reservar",
      "hay mesa libre para hoy",
      "se puede reservar para esta noche",
      "hay cupo para reservar",
      "mesas disponibles para hoy",
      "tienen disponibilidad para almorzar",
    ],
  },
] as const;

export const restaurantProducts: IntentExample<ProductIntentKey>[] = [
  {
    intentKey: "products:view",
    module: "products",
    domain: "restaurant",
    requiresConfirmation: "maybe",
    lang: "es",
    examples: [
      // Universal
      "quiero ver el menú",
      "puedo ver el menú",
      "tienen menú disponible",
      "dame las opciones",
      "muéstrame las opciones",
      "qué platos tienen",

      // España (auténtico)
      "quiero ver la carta",
      "qué hay en la carta",
      "enséñame la carta",
      "qué tienen para cenar",
      "opciones de la carta",

      // Latam (CO/EC/MX)
      "qué hay de comer",
      "menú del día",
      "qué tienen para almorzar",
      "opciones del menú",
      "qué venden hoy",
      "qué ofrecen para comer",
    ],
  },
  {
    intentKey: "products:recommend",
    module: "products",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal
      "qué me recomiendas",
      "qué es lo mejor",
      "qué debo probar",
      "lo más popular",
      "lo más vendido",

      // España
      "qué me recomendáis",
      "el plato estrella",
      "lo más típico",
      "qué piden los clientes",
      "vuestra especialidad",

      // Latam (CO/EC/MX)
      "qué me recomiendan",
      "lo más pedido",
      "sus recomendaciones",
      "qué piden usualmente",
      "lo más famoso",
    ],
  },

  {
    intentKey: "products:find",
    module: "products",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal (búsqueda por atributo)
      "busco algo picante",
      "busco platos vegetarianos",
      "busco comida saludable",
      "busco algo rápido",
      "busco postres dulces",
      "tienen opciones sin gluten",

      // España
      "qué tienen vegetariano",
      "busco platos ligeros",
      "tienen opciones veganas",
      "busco algo tradicional",
      "qué hay sin lactosa",

      // Latam (CO/EC/MX)
      "busco comida picante",
      "tienen platos vegetarianos",
      "busco algo económico",
      "qué hay sin picante",
      "busco platos típicos",
      "tienen opciones rápidas",
    ],
  },
] as const;

export const restaurantOrders: IntentExample<OrderIntentKey>[] = [
  {
    intentKey: "orders:create",
    module: "orders",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal
      "quiero hacer un pedido",
      "necesito hacer un pedido",
      "deseo hacer un pedido",
      "voy a hacer un pedido",
      "quiero pedir ahora",
      "listo para pedir",

      // España
      "voy a pedir comida",
      "quiero pedir para llevar",
      "hacer el pedido ya",
      "quiero realizar el pedido",

      // Latam (CO/EC/MX)
      "quiero hacer una orden",
      "necesito ordenar comida",
      "deseo ordenar ahora",
      "voy a ordenar",
      "quiero ordenar para domicilio",
      "listo para ordenar",
    ],
  },

  {
    intentKey: "orders:modify",
    module: "orders",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal (modificar contenido del pedido)
      "quiero cambiar mi pedido",
      "necesito modificar mi pedido",
      "quiero ajustar mi pedido",
      "cambiar algo del pedido",
      "modificar mi orden",

      // España
      "quiero cambiar el pedido",
      "ajustar mi pedido",
      "agregar al pedido",
      "quitar del pedido",
      "corregir mi pedido",

      // Latam (CO/EC/MX)
      "cambiar mi orden",
      "modificar mi orden",
      "agregar a mi orden",
      "quitar de mi orden",
      "actualizar mi pedido",
      "corregir mi orden",
    ],
  },
  {
    intentKey: "orders:cancel",
    module: "orders",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal
      "quiero cancelar mi pedido",
      "necesito cancelar mi pedido",
      "cancelar mi pedido",
      "ya no quiero el pedido",
      "no quiero mi pedido",

      // España
      "quiero anular el pedido",
      "anular mi pedido",
      "ya no quiero la comida",
      "cancelad mi pedido",
      "no quiero recogerlo",

      // Latam (CO/EC/MX)
      "quiero cancelar mi orden",
      "anular mi orden",
      "cancelar mi orden",
      "ya no quiero la orden",
      "no quiero mi orden",
      "desmarcar mi pedido",
    ],
  },
] as const;
