import type {
  BookingIntentKey,
  EroticIntentKey,
  InformationalIntentKey,
  IntentExample,
  RestaurantIntentKey,
  SocialProtocolIntent,
} from "./intent.types";

// ============================================
// 1. INTENTS
// ============================================

/**
 * Ejemplos de protocolos sociales para vectorizar y guardar en DB vectorial.
 * Estos vectores se cachean GLOBALMENTE y se reutilizan entre todos los usuarios/negocios.
 *
 * IMPORTANTE: Estos NO se procesan con shouldSkipProcessing porque contienen
 * variaciones más largas que requieren búsqueda semántica.
 */
const socialProtocols: IntentExample<SocialProtocolIntent>[] = [
  {
    intentKey: "social:greeting",
    module: "social-protocol",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      // Variaciones largas que NO detecta el regex
      "muy buenos días",
      "hola qué tal todo",
      "buenas tardes cómo está",
      "qué tal amigo",
      "hola buen día",
      "buenas noches estimado",
      "saludos cordiales",
      "un saludo",
      "qué onda",
      "cómo andas",
      "hola buenas",
      // Combinaciones
      "hola buen día cómo estás",
      "buenas qué tal",
      "hey qué tal todo",
    ],
  },
  {
    intentKey: "social:goodbye",
    module: "social-protocol",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      "hasta la próxima",
      "nos estamos viendo",
      "que tengas buen día",
      "hasta otro día",
      "cuídate mucho",
      "que estés bien",
      "un abrazo",
      "saludos cordiales",
      "bye que estés bien",
      "chau nos vemos pronto",
      "hasta luego cuídate",
      "adiós gracias por todo",
    ],
  },
  {
    intentKey: "social:thanks",
    module: "social-protocol",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      "muchas gracias por todo",
      "te agradezco mucho",
      "mil gracias de verdad",
      "gracias por tu ayuda",
      "te lo agradezco",
      "muy agradecido",
      "gracias por la información",
      "gracias por atenderme",
      "agradezco tu tiempo",
      "thank you so much",
      "gracias igualmente",
    ],
  },
];

const conversationalSignals: IntentExample<SocialProtocolIntent>[] = [
  {
    intentKey: "signal:affirmation",
    module: "conversational-signal",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      "sí por favor",
      "claro que sí",
      "por supuesto",
      "efectivamente",
      "así es",
      "está bien",
      "de acuerdo",
      "está perfecto",
      "sí está bien",
      "ok perfecto",
      "dale si",
      "vale estoy de acuerdo",
      "ok vamos",
      "sí claro",
      "exactamente eso",
    ],
  },
  {
    intentKey: "signal:negation",
    module: "conversational-signal",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      "no gracias",
      "no por ahora",
      "no creo",
      "no es necesario",
      "mejor no",
      "no está bien",
      "no me interesa",
      "no quiero",
      "tampoco me interesa",
      "ya no lo necesito",
      "no es correcto",
    ],
  },
  {
    intentKey: "signal:uncertainty",
    module: "conversational-signal",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      "no estoy muy seguro",
      "no sé bien",
      "tal vez sí",
      "quizás más tarde",
      "puede que sí",
      "no estoy seguro todavía",
      "no sé qué decir",
      "déjame pensarlo",
      "mmm no sé",
      "tengo dudas",
      "no sabría decirte",
    ],
  },
];

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
    intentKey: "booking:create",
    module: "booking",
    requiresConfirmation: "always",
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
    intentKey: "booking:modify",
    module: "booking",
    requiresConfirmation: "always",
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
    intentKey: "booking:cancel",
    module: "booking",
    requiresConfirmation: "always",
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
    intentKey: "booking:check_availability",
    module: "booking",
    requiresConfirmation: "always",
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
    intentKey: "restaurant:view_menu",
    module: "restaurant",
    requiresConfirmation: "maybe",
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
    intentKey: "restaurant:place_order",
    module: "restaurant",
    requiresConfirmation: "always",
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
    intentKey: "restaurant:find_dishes",
    module: "restaurant",
    requiresConfirmation: "always",
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
    intentKey: "restaurant:recommend_dishes",
    module: "restaurant",
    requiresConfirmation: "always",
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
    intentKey: "restaurant:update_order",
    module: "restaurant",
    requiresConfirmation: "always",
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
    intentKey: "restaurant:cancel_order",
    module: "restaurant",
    requiresConfirmation: "always",
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
    intentKey: "restaurant:ask_delivery_time",
    module: "restaurant",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      "cuánto tarda en llegar",
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
    intentKey: "restaurant:ask_delivery_method",
    module: "restaurant",
    requiresConfirmation: "never",
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
  {
    intentKey: "restaurant:ask_price",
    module: "restaurant",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      "cuánto cuesta el plato",
      "que precio tiene el combo",
      "que precio tiene la bebida",
      "cual es el precio del plato",
      "valor total a pagar por el pedido",
      "cuanto hay que pagar por la comida",
      "cuanto es la cuenta de mi orden",
      "cuanto es el total final de mi comida",
    ],
  },
];

const erotic: IntentExample<EroticIntentKey>[] = [
  {
    intentKey: "erotic:view_content",
    module: "erotic",
    lang: "es",
    requiresConfirmation: "maybe",
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
    intentKey: "erotic:purchase_content",
    module: "erotic",
    lang: "es",
    requiresConfirmation: "maybe",
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
    intentKey: "erotic:ask_services",
    module: "erotic",
    lang: "es",
    requiresConfirmation: "maybe",
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

const basicInformation: IntentExample<InformationalIntentKey>[] = [
  {
    intentKey: "info:ask_location",
    module: "informational",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      "dónde queda",
      "ayudame con la dirección",
      "dame la ubicación",
      "dime cómo llegar",
      "dime dónde están",
      "dónde está ubicado el establecimiento",
      "en qué calle están ubicados",
    ],
  },
  {
    intentKey: "info:ask_business_hours",
    module: "informational",
    requiresConfirmation: "never",
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
    intentKey: "info:ask_payment_methods",
    module: "informational",
    requiresConfirmation: "never",
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
    intentKey: "info:ask_contact",
    module: "informational",
    requiresConfirmation: "never",
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
  ...socialProtocols,
  ...conversationalSignals,

  ...basicInformation,
  ...booking,
  ...restaurant,
  ...erotic,
];
