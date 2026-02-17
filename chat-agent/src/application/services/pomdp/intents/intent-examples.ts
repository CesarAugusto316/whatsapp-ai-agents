import { erotic } from "./erotic";
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
 *
 * @prompt entre 4 a 7 palabras semanticamente consistentes y coherentes con cada
 * intencion, debe haber variedad y reflejar diferentes localidades españa, latam.
 * Entre 15 - 25 ejemplos por intent
 *
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
] as const;

const conversationalSignals: IntentExample<SocialProtocolIntent>[] = [
  {
    intentKey: "signal:affirmation",
    module: "conversational-signal",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      "sí por favor",
      "claro que sí",
      "sí por supuesto",
      "efectivamente",
      "sí así es",
      "sí está bien",
      "sí de acuerdo",
      "sí está perfecto",
      "sí está bien",
      "ok perfecto",
      "dale sí",
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
] as const;

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
      // Universal (núcleo semántico limpio)
      "quiero hacer una reserva",
      "necesito reservar ahora",
      "me gustaría reservar",
      "voy a reservar",
      "quiero apartar lugar",

      // España (auténtico, sin slots)
      "quiero dejar mesa",
      "puedo reservar mesa",
      "deja sitio para dos",
      "quiero pillar mesa",
      "necesito un turno",
      "apúntame en la lista",

      // Latam (CO/EC/MX)
      "déjame apartado",
      "guarda lugar para mí",
      "bloquea un espacio",
      "quiero asegurar cupo",
    ],
  },
  {
    intentKey: "booking:modify",
    module: "booking",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal
      "quiero cambiar mi reserva",
      "necesito modificar la reserva",
      "puedo ajustar mi reserva",
      "quiero reprogramar mi reserva",
      "necesito mover la reserva",

      // España
      "mover la reserva para otro día",
      "cambiar la fecha de la reserva",
      "adelantar la reserva",
      "atrasar la reserva",
      "cambiar el horario de la reserva",

      // Latam (CO/EC/MX)
      "correr la reserva para otra fecha",
      "recorrer la reserva",
      "mover la reserva para otro día",
      "cambiar el día de la reserva",
    ],
  },
  {
    intentKey: "booking:cancel",
    module: "booking",
    requiresConfirmation: "always",
    lang: "es",
    examples: [
      // Universal - SOLO verbos explícitos
      "quiero cancelar mi reserva",
      "necesito cancelar la reserva",
      "cancelar mi reserva",

      // España
      "quiero anular la reserva",
      "anular mi reserva",
      "dame de baja la reserva",
      "quita mi reserva",

      // Latam (CO/EC/MX)
      "desmarca mi reserva",
      "ya no voy a ir a la reserva",
      "ya no puedo ir a la reserva",
      "no voy a poder asistir",
    ],
  },
  {
    intentKey: "booking:check_availability",
    module: "booking",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      // Universal
      "hay disponibilidad",
      "qué horarios tienen libres",
      "qué días tienen disponibles",
      "hay para hoy",
      "pueden atenderme",

      // España
      "queda sitio",
      "tenéis hueco",
      "estáis completos",
      "queda mesa",
      "estáis llenos",

      // Latam (CO/EC/MX)
      "queda lugar",
      "hay mesa libre",
      "se puede reservar",
      "están ocupados",
      "hay cupo",
      "mesas disponibles",
    ],
  },
] as const;

const restaurant: IntentExample<RestaurantIntentKey>[] = [
  {
    intentKey: "restaurant:view_menu",
    module: "restaurant",
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
    intentKey: "restaurant:place_order",
    module: "restaurant",
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
    intentKey: "restaurant:find_dishes",
    module: "restaurant",
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
  {
    intentKey: "restaurant:recommend_dishes",
    module: "restaurant",
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
    intentKey: "restaurant:update_order",
    module: "restaurant",
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
    intentKey: "restaurant:cancel_order",
    module: "restaurant",
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

const basicInformation: IntentExample<InformationalIntentKey>[] = [
  {
    intentKey: "info:ask_location",
    module: "informational",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      // Universal
      "dónde queda el local",
      "dime la dirección exacta",
      "cuál es su ubicación",
      "dónde está ubicado",
      "cómo llegar al lugar",
      "dónde se encuentran",

      // España (auténtico)
      "dónde está el establecimiento",
      "en qué calle estáis",
      "dónde os encontráis",
      "dirección del restaurante",
      "cómo llegar hasta allí",
      "en qué zona estáis",

      // Latam (CO/EC/MX)
      "dónde queda el negocio",
      "en qué calle quedan",
      "dónde está el local",
      "cuál es la dirección",
      "cómo llego al lugar",
      "en qué sector quedan",
    ],
  },
  {
    intentKey: "info:ask_business_hours",
    module: "informational",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      // Universal
      "a qué hora abren",
      "a qué hora cierran",
      "cuál es el horario",
      "horario de atención hoy",
      "están abiertos ahora",
      "hasta qué hora están abiertos",

      // España
      "a qué hora abrís",
      "a qué hora cerráis",
      "horario de apertura",
      "estáis abiertos hoy",
      "hasta cuándo estáis abiertos",
      "horario del establecimiento",

      // Latam (CO/EC/MX)
      "a qué hora abren ustedes",
      "a qué hora cierran ustedes",
      "cuál es su horario",
      "horario de atención completo",
      "están abiertos hoy",
      "hasta qué hora atienden",
    ],
  },
  {
    intentKey: "info:ask_payment_methods",
    module: "informational",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      // Universal
      "qué formas de pago aceptan",
      "métodos de pago aceptados",
      "aceptan tarjeta de crédito",
      "puedo pagar con efectivo",
      "aceptan pago digital",

      // España
      "aceptáis tarjeta",
      "puedo pagar con tarjeta",
      "aceptáis efectivo",
      "pagos con bizum",
      "aceptáis transferencia",
      "pagar con móvil",

      // Latam (CO/EC/MX)
      "aceptan tarjeta débito",
      "puedo pagar en efectivo",
      "aceptan nequi o daviplata",
      "pago con transferencia",
      "aceptan pago móvil",
      "métodos de pago disponibles",
    ],
  },
  {
    intentKey: "info:ask_contact",
    module: "informational",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      // Universal
      "cómo puedo contactarlos",
      "tienen número de teléfono",
      "correo electrónico por favor",
      "redes sociales del negocio",
      "cómo hablar con ustedes",

      // España
      "teléfono de contacto",
      "cómo contactaros",
      "tenéis instagram",
      "correo electrónico del local",
      "cómo hablar con vosotros",
      "redes sociales del establecimiento",

      // Latam (CO/EC/MX)
      "número de contacto",
      "tienen whatsapp",
      "correo del negocio",
      "instagram del local",
      "cómo contactarlos",
      "teléfono para llamar",
    ],
  },
  {
    intentKey: "info:ask_price",
    module: "informational",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      // Universal (núcleo semántico)
      "cuánto cuesta esto",
      "qué precio tiene",
      "a cuánto sale",
      "cuál es el costo",
      "cuánto vale esto",

      // Variaciones léxicas
      "cuál es el valor",
      "cuánto debo pagar",
      "cuál es la tarifa",
      "cuánto es en total",
      "precio del servicio",

      // España (auténtico)
      "a cómo está esto",
      "cuánto os debo",
      "precio de la comida",
      "cuánto cuesta el menú",
      "valor del plato",

      // Latam (CO/EC/MX)
      "cuánto me cobran",
      "precio de la orden",
      "cuánto sale esto",
      "precio del producto",
      "cuánto cuesta todo",
    ],
  },
  {
    intentKey: "info:ask_delivery_time",
    module: "informational",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      // Universal
      "cuánto tarda en llegar",
      "en cuánto tiempo llega",
      "cuánto demora el pedido",
      "cuánto tiempo toma",
      "cuándo llega el pedido",

      // España
      "cuánto tarda el reparto",
      "tiempo de entrega",
      "cuánto falta para llegar",
      "cuándo estará aquí",
      "cuánto tarda para llevar",

      // Latam (CO/EC/MX)
      "cuánto demora la comida",
      "cuánto tarda el domicilio",
      "tiempo de llegada",
      "cuándo llega mi pedido",
      "cuánto falta para entregar",
      "cuánto demora el delivery",
    ],
  },
  {
    intentKey: "info:ask_delivery_method",
    module: "informational",
    requiresConfirmation: "never",
    lang: "es",
    examples: [
      // Universal
      "cómo entregan el pedido",
      "cómo llega el pedido",
      "métodos de entrega",
      "formas de entrega",

      // España
      "hacen para llevar",
      "puedo recoger",
      "entregan a domicilio",
      "recoger en tienda",
      "solo para llevar",
      "tienen reparto",

      // Latam (CO/EC/MX)
      "hacen delivery",
      "llevan a domicilio",
      "puedo recoger personalmente",
      "entrega a domicilio",
      "recoger en el local",
      "tienen envío",
    ],
  },
] as const;

export const intentExamples = [
  ...socialProtocols,
  ...conversationalSignals,

  ...basicInformation,
  ...booking,
  ...restaurant,
  ...erotic,
] as const;
