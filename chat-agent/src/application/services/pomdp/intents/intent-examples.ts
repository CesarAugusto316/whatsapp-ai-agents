import type {
  BookingIntentKey,
  EroticIntentKey,
  InformationalIntentKey,
  IntentExample,
  RestaurantIntentKey,
} from "./intent.types";

// ============================================
// 1. INTENTS MEJORADOS
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
const booking: IntentExample<BookingIntentKey>[] = [
  {
    intent: "booking:create",
    module: "booking",
    requiresConfirmation: true,
    lang: "es",
    examples: [
      "quiero hacer una reserva",
      "tiene reservaciones",
      "me gustaría agendar una cita",
      "necesito apartar un espacio para mañana",
      "quisiera reservar para dos personas",
      "puedes ayudarme a sacar una cita",
      "quiero una habitación para el viernes",
      "busco agendar una visita",
      "necesito reservar un cupo",
      "quiero asegurar un lugar",
    ],
  },
  {
    intent: "booking:modify",
    module: "booking",
    requiresConfirmation: true,
    lang: "es",
    examples: [
      "quiero cambiar mi reserva",
      "necesito mover la cita",
      "puedo cambiar la hora",
      "quiero modificar la fecha",
      "hay forma de reprogramar",
      "quiero adelantar la cita",
      "necesito corregir mi reserva",
      "puedo moverla para mañana",
    ],
  },
  {
    intent: "booking:cancel",
    module: "booking",
    requiresConfirmation: true,
    lang: "es",
    examples: [
      "quiero cancelar",
      "ya no voy a poder asistir",
      "puedes eliminar mi reserva",
      "necesito anular la cita",
      "ya no la necesito",
      "no voy a llegar",
      "quiero cancelar lo que agendé",
    ],
  },
  {
    intent: "booking:check_availability",
    module: "booking",
    lang: "es",
    examples: [
      "hay disponibilidad",
      "qué horarios están libres",
      "tienen espacio hoy",
      "hay cupos mañana",
      "qué días tienen disponibles",
      "hay mesas libres",
      "pueden atenderme ahora",
      "qué horas están disponibles",
    ],
  },
];

const restaurant: IntentExample<RestaurantIntentKey>[] = [
  {
    intent: "restaurant:view_menu",
    module: "restaurant",
    // requiresConfirmation: false | "maybe", // just give the user menu
    lang: "es",
    examples: [
      "qué venden",
      "qué ofrecen",
      "cual es la oferta",
      "puedo ver el menú",
      "tienen menu",
      "dame las opciones",
      "muéstrame las opciones",
      "qué platos tienen",
      "qué hay para comer",
      "quiero ver la carta",
    ],
  },
  {
    intent: "restaurant:place_order",
    module: "restaurant",
    requiresConfirmation: true,
    lang: "es",
    examples: [
      "quiero hacer un pedido",
      "necesito hacer un pedido",
      "deseo ordenar",
      "voy a pedir",
      "quiero comprar comida",
      "quisiera ordenar",
      "listo para pedir",
      "quiero hacer mi pedido",
    ],
  },
  {
    intent: "restaurant:find_dishes",
    module: "restaurant",
    requiresConfirmation: true,
    lang: "es",
    /**
     * @todo HACER HYBRID SEARCH VECTOR + EXACT WORD MATCH
     * @example
     * Usuario: "busco pizzas"
     * Intent classifier → restaurant:find_dishes (score: 0.62) ⚠️ baja confianza
              ↓
     * POMDP detecta alta entropía → "¿Deseas buscar pizzas en el menú?"
              ↓
     * Usuario: "sí" ✅
              ↓
     * POMDP: confianza → 0.95 → ejecutar searchProducts("busco pizzas", businessId)
              ↓
     * Resultados: pizza margherita, pepperoni, hawaiana 🍕
     *
     */
    examples: [
      "qué opciones hay con",
      "busco algo con",
      "busco algo picante",
      "busco entradas",
      "busco sopas",
      "busco comida con carne",
      "busco comida con muchas verduras y saludable",
      "busco algo con poca sal",
      "tienen opciones vegetarianas",
      "encuentra platos con pollo",
      "qué opciones hay con queso",
      "busco postres",
      "encuéntrame algo saludable",
      "tienen opciones sin gluten",
      "busco algo rápido",
      "qué platos tienen con camarones",
      "buscame algo dulce",
    ],
  },
  {
    intent: "restaurant:recommend_dishes",
    module: "restaurant",
    requiresConfirmation: true,
    lang: "es",
    examples: [
      "qué me recomiendas",
      "el plato estrella",
      "lo más popular",
      "qué es lo mejor",
      "qué debo probar",
      "tus recomendaciones",
      "lo más vendido",
      "qué piden usualmente",
    ],
  },
  {
    intent: "restaurant:update_order",
    module: "restaurant",
    requiresConfirmation: true,
    lang: "es",
    examples: [
      "quiero actualizar mi pedido",
      "quiero cambiar algo en mi orden",
      "quiero modificar mi pedido",
      "quiero agregar algo más",
      "quiero eliminar algo",
      "quiero actualizar mi dirección",
      "quiero actualizar mi método de pago",
      "quiero actualizar mi información de contacto",
    ],
  },
  {
    intent: "restaurant:cancel_order",
    module: "restaurant",
    requiresConfirmation: true,
    lang: "es",
    examples: [
      "quiero cancelar mi pedido",
      "quiero anular mi orden",
      "quiero cancelar mi compra",
      "quiero cancelar mi pedido",
      "quiero cancelar mi pedido de comida",
      "quiero cancelar mi cita de cena",
      "quiero cancelar mi cita de almuerzo",
    ],
  },
  {
    intent: "restaurant:ask_delivery_time",
    module: "restaurant",
    lang: "es",
    examples: [
      "cuánto tarda",
      "en cuánto tiempo llega",
      "cuánto demora la comida",
      "a qué hora estaría",
      "cuánto tiempo toma",
      "cuánto falta",
      "qué tiempo de espera hay",
      "cuándo estaría listo",
    ],
  },
  {
    intent: "restaurant:ask_delivery_method",
    module: "restaurant",
    lang: "es",
    examples: [
      "cómo entregan",
      "hacen delivery",
      "puedo recoger",
      "llevan a domicilio",
      "cómo llega el pedido",
      "tienen envío",
      "cómo funciona la entrega",
    ],
  },
];

const erotic: IntentExample<EroticIntentKey>[] = [
  {
    intent: "erotic:view_content",
    module: "erotic",
    lang: "es",
    examples: [
      "quiero ver tus fotos",
      "muéstrame tu contenido",
      "ver tus videos",
      "qué contenido ofreces",
      "ver tus packs",
      "explorar tu galería",
      "quiero ver más de ti",
    ],
  },
  {
    intent: "erotic:purchase_content",
    module: "erotic",
    lang: "es",
    examples: [
      "quiero comprar esta foto",
      "quiero este pack",
      "me gustaría comprar un video",
      "quiero adquirir contenido",
      "quiero comprar ahora",
      "cómo compro",
      "quiero este contenido",
    ],
  },
  {
    intent: "erotic:ask_services",
    module: "erotic",
    lang: "es",
    examples: [
      "haces videollamadas",
      "ofreces contenido personalizado",
      "qué modalidades tienes",
      "cuáles son tus horarios",
      "tienes packs especiales",
      "cuánto cuesta una sesión",
      "tienes promociones",
    ],
  },
];

const informational: IntentExample<InformationalIntentKey>[] = [
  {
    intent: "info:ask_location",
    module: "informational",
    lang: "es",
    examples: [
      "dónde queda",
      "dirección",
      "ubicación",
      "cómo llegar",
      "dónde están",
      "dónde está ubicado",
      "en qué calle",
      "cómo llego",
    ],
  },
  {
    intent: "info:ask_business_hours",
    module: "informational",
    lang: "es",
    examples: [
      "a qué hora abren",
      "a qué hora cierran",
      "cuál es el horario",
      "están abiertos",
      "horario de atención",
      "hasta qué hora trabajan",
      "atienden los domingos",
      "horarios de hoy",
    ],
  },
  {
    intent: "info:ask_payment_methods",
    module: "informational",
    lang: "es",
    examples: [
      "aceptan tarjeta",
      "puedo pagar con transferencia",
      "formas de pago",
      "métodos de pago",
      "efectivo solamente",
      "aceptan crédito",
    ],
  },
  {
    intent: "info:ask_contact",
    module: "informational",
    lang: "es",
    examples: [
      "cómo los contacto",
      "tienen teléfono",
      "número de contacto",
      "correo electrónico",
      "instagram",
      "redes sociales",
    ],
  },
];

export const intentExamples = [
  ...booking,
  ...restaurant,
  ...erotic,
  ...informational,
];
