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
      // Universal (explícito sobre comida/platos)
      "quiero ver el menú de comidas",
      "puedo ver la carta de platos",
      "tienen menú disponible hoy",
      "dame las opciones de comida",
      "muéstrame los platos del menú",
      "qué platos tienen para comer",
      "ver el menú del restaurante",

      // España (auténtico y explícito)
      "quiero ver la carta de comer",
      "qué hay en la carta hoy",
      "enséñame la carta de platos",
      "qué tienen para cenar hoy",
      "opciones de la carta del día",
      "ver los platos de la carta",

      // Latam (CO/EC/MX)
      "qué hay de comer hoy",
      "menú del día para almorzar",
      "qué tienen para almorzar hoy",
      "opciones del menú de comida",
      "qué venden para comer hoy",
      "qué ofrecen para cenar",
      "ver el menú de platos",
    ],
  },
  {
    intentKey: "products:recommend",
    module: "products",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal (explícito sobre platos/comida)
      "qué plato me recomiendas",
      "qué es lo mejor para comer",
      "qué debo probar del menú",
      "cuál es el plato más popular",
      "lo más vendido de la carta",
      "recomiéndame un plato típico",

      // España
      "qué me recomendáis de la carta",
      "cuál es el plato estrella",
      "lo más típico del restaurante",
      "qué piden los clientes siempre",
      "vuestra especialidad de la casa",
      "recomendadme un plato bueno",

      // Latam (CO/EC/MX)
      "qué me recomiendan para comer",
      "lo más pedido del menú",
      "sus recomendaciones de platos",
      "qué piden usualmente los clientes",
      "lo más famoso del restaurante",
      "recomiéndenme algo rico",
    ],
  },

  {
    intentKey: "products:find",
    module: "products",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal (búsqueda por atributo de plato)
      "busco un plato picante",
      "busco platos vegetarianos del menú",
      "busco comida saludable de la carta",
      "busco un plato rápido de preparar",
      "busco postres dulces del menú",
      "tienen opciones sin gluten en la carta",
      "hay platos veganos disponibles",

      // España
      "qué tienen vegetariano en la carta",
      "busco platos ligeros para cenar",
      "tienen opciones veganas hoy",
      "busco algo tradicional del menú",
      "qué hay sin lactosa en la carta",
      "platos sin carne disponibles",

      // Latam (CO/EC/MX)
      "busco comida picante del menú",
      "tienen platos vegetarianos hoy",
      "busco algo económico de la carta",
      "qué hay sin picante para comer",
      "busco platos típicos del restaurante",
      "tienen opciones rápidas del menú",
      "hay algo sin queso en la carta",
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
      // Universal (explícito sobre comida/pedido)
      "quiero hacer un pedido de comida",
      "necesito hacer un pedido ahora",
      "deseo hacer un pedido del menú",
      "voy a hacer un pedido de platos",
      "quiero pedir comida ahora",
      "listo para pedir del menú",
      "hacer un pedido del restaurante",

      // España
      "voy a pedir comida para llevar",
      "quiero pedir platos para llevar",
      "hacer el pedido de comida ya",
      "quiero realizar el pedido del menú",
      "pedir comida del restaurante",

      // Latam (CO/EC/MX)
      "quiero hacer una orden de comida",
      "necesito ordenar del menú",
      "deseo ordenar comida ahora",
      "voy a ordenar platos",
      "quiero ordenar para domicilio",
      "listo para ordenar del menú",
      "hacer una orden del restaurante",
    ],
  },

  {
    intentKey: "orders:modify",
    module: "orders",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal (modificar contenido del pedido de comida)
      "quiero cambiar mi pedido de comida",
      "necesito modificar mi pedido del menú",
      "quiero ajustar mi pedido de platos",
      "cambiar algo del pedido de comida",
      "modificar mi orden de comida",
      "agregar un plato al pedido",
      "quitar un plato del pedido",

      // España
      "quiero cambiar el pedido de comida",
      "ajustar mi pedido del menú",
      "agregar comida al pedido",
      "quitar comida del pedido",
      "corregir mi pedido de platos",
      "cambiar un plato del pedido",

      // Latam (CO/EC/MX)
      "cambiar mi orden de comida",
      "modificar mi orden del menú",
      "agregar un plato a mi orden",
      "quitar un plato de mi orden",
      "actualizar mi pedido de comida",
      "corregir mi orden de platos",
    ],
  },
  {
    intentKey: "orders:cancel",
    module: "orders",
    domain: "restaurant",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal (cancelar pedido de comida explícito)
      "quiero cancelar mi pedido de comida",
      "necesito cancelar mi pedido del menú",
      "cancelar mi pedido de platos",
      "ya no quiero el pedido de comida",
      "no quiero mi pedido del restaurante",
      "anular pedido de comida",

      // España
      "quiero anular el pedido de comida",
      "anular mi pedido del menú",
      "ya no quiero la comida pedida",
      "cancelad mi pedido de platos",
      "no quiero recoger la comida",
      "anular pedido del restaurante",

      // Latam (CO/EC/MX)
      "quiero cancelar mi orden de comida",
      "anular mi orden del menú",
      "cancelar mi orden de platos",
      "ya no quiero la orden de comida",
      "no quiero mi orden del restaurante",
      "desmarcar mi pedido de comida",
    ],
  },
] as const;
