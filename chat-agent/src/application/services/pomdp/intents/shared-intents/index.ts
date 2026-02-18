import {
  InformationalIntentKey,
  IntentExample,
  SocialProtocolIntent,
} from "../intent.types";

export const conversationalSignals: IntentExample<SocialProtocolIntent>[] = [
  {
    intentKey: "signal:affirmation",
    module: "conversational-signal",
    domain: null,
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
    domain: null,
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
    domain: null,
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
export const socialProtocols: IntentExample<SocialProtocolIntent>[] = [
  {
    intentKey: "social:greeting",
    module: "social-protocol",
    domain: null,
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
    domain: null,
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
    domain: null,
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

export const basicInformation: IntentExample<InformationalIntentKey>[] = [
  {
    intentKey: "info:ask_location",
    module: "informational",
    domain: null,
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
      "dirección del negocio",
      "cómo puedo llegar hasta allí",
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
    domain: null,
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
    domain: null,
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
    domain: null,
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
    domain: null,
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
      "cual precio del servicio",

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
    domain: null,
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
    domain: null,
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
