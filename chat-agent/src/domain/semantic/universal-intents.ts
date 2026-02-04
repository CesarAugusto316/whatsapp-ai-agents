import { SemanticIntent } from "@/infraestructure/rag";

export type UniversalIntentKey =
  | "ask_location"
  | "ask_pricing"
  | "ask_business_hours"
  | "confirm"
  | "greeting"
  | "reject"
  | "goodbye";

export type BookingIntentKey =
  | "create_booking"
  | "modify_booking"
  | "cancel_booking"
  | "check_availability"
  | "provide_booking_details";

export type DeliveryIntentKey =
  | "place_delivery_order"
  | "track_delivery"
  | "cancel_delivery"
  | "update_delivery_address"
  | "change_delivery_time"
  | "add_delivery_instructions"
  | "ask_delivery_fee"
  | "ask_delivery_time"
  | "select_delivery_type"
  | "report_delivery_issue";

export type Domain = "bookings" | "delivery" | "global";

export type GlobalSemanticIntent = SemanticIntent<
  UniversalIntentKey | BookingIntentKey | DeliveryIntentKey,
  Domain
>;

/**
 * Intents globales, vectorizados una sola vez.
 * Todos los dominios pueden reutilizarlos.
 */
export const globalIntents: GlobalSemanticIntent[] = [
  {
    intent: "greeting",
    domain: "global",
    lang: "es",
    examples: [
      "hola",
      "buenas",
      "buen día",
      "qué tal",
      "buenas noches",
      "buenas tardes",
      "saludos",
      "hello",
      "hi",
    ],
  },
  {
    intent: "goodbye",
    domain: "global",
    lang: "es",
    examples: ["hasta luego", "nos vemos", "chau", "adiós", "hasta pronto"],
  },
  {
    intent: "ask_pricing",
    domain: "global",
    lang: "es",
    examples: [
      "cuánto cuesta",
      "precio",
      "tarifas",
      "valor",
      "cuánto vale",
      "costo",
      "costo de",
      "cual es el total",
      "total de",
    ],
  },
  {
    intent: "ask_location",
    domain: "global",
    lang: "es",
    examples: [
      "dónde queda",
      "dirección",
      "ubicación",
      "cómo llegar",
      "donde esta el negocio",
      "donde esta ubicado",
    ],
  },
  {
    intent: "ask_business_hours",
    domain: "global",
    lang: "es",
    examples: [
      "a qué hora abren",
      "a qué hora cierran",
      "cuál es el horario",
      "están abiertos hoy",
      "horario de atención",
      "denme los horarios",
      "desde que hora trabajan",
      "hasta que hora trabajan",
      "trabajan en feriados",
    ],
  },
  {
    intent: "confirm",
    domain: "global",
    lang: "es",
    examples: [
      "sí confirmo",
      "confirmado",
      "dale",
      "perfecto",
      "ok",
      "está bien",
      "claro que sí",
      "vamos",
      "sí por favor",
    ],
  },
  {
    intent: "reject",
    domain: "global",
    lang: "es",
    examples: [
      "no",
      "no deseo",
      "ya no quiero",
      "claro que no",
      "no gracias",
      "no nunca más",
    ],
  },
];

export const bookingIntents: GlobalSemanticIntent[] = [
  {
    intent: "create_booking",
    domain: "bookings",
    lang: "es",
    examples: [
      "quiero reservar",
      "quiero agendar",
      "hacer una reserva",
      "quiero apartar una mesa",
      "me puedes agendar",
      "quisiera hacer una cita",
      "reservar para mañana",
      "quiero una habitación",
      "quiero separar un cupo",
      "quiero apartar un espacio",
    ],
  },

  {
    intent: "modify_booking",
    domain: "bookings",
    lang: "es",
    examples: [
      "quiero cambiar mi reserva",
      "modificar mi cita",
      "puedo mover la hora",
      "necesito cambiar la fecha",
      "actualizar mi reservación",
      "quiero reprogramar",
    ],
  },

  {
    intent: "cancel_booking",
    domain: "bookings",
    lang: "es",
    examples: [
      "quiero cancelar",
      "cancelar mi reserva",
      "ya no puedo asistir",
      "anular mi cita",
      "quiero eliminar la reservación",
    ],
  },

  {
    intent: "check_availability",
    domain: "bookings",
    lang: "es",
    examples: [
      "hay disponibilidad",
      "tienen espacio hoy",
      "hay cupos mañana",
      "hay espacio para dos personas",
      "qué horarios están libres",
      "tienen mesas disponibles",
      "hay habitaciones libres",
    ],
  },

  {
    intent: "provide_booking_details",
    domain: "bookings",
    lang: "es",
    examples: [
      "somos dos personas",
      "para mañana a las ocho",
      "mi nombre es Carlos",
      "sería para el viernes",
      "una habitación doble",
      "mesa para cuatro personas",
      "para esta noche",
      "para 2",
    ],
  },
];

export const deliveryIntents: GlobalSemanticIntent[] = [
  {
    intent: "place_delivery_order",
    domain: "delivery",
    lang: "es",
    examples: [
      "quiero pedir para entrega",
      "quiero hacer un pedido",
      "ordenar para entrega",
      "pedir para llevar",
      "hacer pedido a domicilio",
      "quiero que me lo traigan",
      "ordenar delivery",
      "pedir para entregar",
      "solicitar entrega",
      "hacer pedido para enviar",
      "quiero retirar en tienda",
      "voy a recoger en el local",
    ],
  },
  {
    intent: "track_delivery",
    domain: "delivery",
    lang: "es",
    examples: [
      "dónde está mi pedido",
      "seguir entrega",
      "cuándo llega mi pedido",
      "estado del delivery",
      "localizar repartidor",
      "dónde está el delivery",
      "tiempo de entrega restante",
      "ver ubicación del repartidor",
      "seguimiento en tiempo real",
      "estado de mi orden",
      "dónde está mi paquete",
      "seguimiento de mi encargo",
    ],
  },
  {
    intent: "cancel_delivery",
    domain: "delivery",
    lang: "es",
    examples: [
      "cancelar pedido",
      "ya no quiero el delivery",
      "anular entrega",
      "cancelar pedido hecho",
      "detener pedido en camino",
      "no entreguen más",
      "cancelar orden",
      "desechar pedido",
      "parar entrega",
      "abortar delivery",
    ],
  },
  {
    intent: "update_delivery_address",
    domain: "delivery",
    lang: "es",
    examples: [
      "cambiar dirección de entrega",
      "actualizar domicilio",
      "envíen a otra dirección",
      "cambiar lugar de entrega",
      "modificar ubicación",
      "enviar a trabajo en vez de casa",
      "actualizar dirección del pedido",
      "cambiar destino",
      "modificar domicilio de recepción",
      "enviar a otra casa",
      "cambiar dirección de retiro",
      "recojo en otra sucursal",
    ],
  },
  {
    intent: "change_delivery_time",
    domain: "delivery",
    lang: "es",
    examples: [
      "cambiar hora de entrega",
      "quiero recibirlo más tarde",
      "adelantar entrega",
      "posponer delivery",
      "modificar hora del pedido",
      "cambiar franja horaria",
      "entregar a otra hora",
      "ajustar tiempo de entrega",
      "reprogramar hora de recepción",
      "entreguen más temprano",
      "cambiar hora de retiro",
      "recoger a otra hora",
    ],
  },
  {
    intent: "add_delivery_instructions",
    domain: "delivery",
    lang: "es",
    examples: [
      "agregar instrucciones",
      "dejar en la puerta",
      "llamar antes de llegar",
      "entregar a conserjería",
      "no tocar timbre",
      "instrucciones especiales",
      "entregar a vecino",
      "dejar en recepción",
      "anotaciones para el repartidor",
      "entregar sin contacto",
      "instrucciones para retiro",
      "indicaciones para entrega",
    ],
  },
  {
    intent: "ask_delivery_fee",
    domain: "delivery",
    lang: "es",
    examples: [
      "cuánto cuesta el envío",
      "costo de delivery",
      "hay cargo por entrega",
      "precio del servicio a domicilio",
      "valor del envío",
      "tarifa de reparto",
      "costo adicional por entrega",
      "se paga delivery",
      "precio por traer el pedido",
      "cuánto es el recargo por envío",
      "hay costo por retiro",
      "es gratis recoger en tienda",
    ],
  },
  {
    intent: "ask_delivery_time",
    domain: "delivery",
    lang: "es",
    examples: [
      "cuánto tarda el envío",
      "tiempo de entrega",
      "en cuánto llega",
      "hora estimada de llegada",
      "cuándo recibiré mi pedido",
      "tiempo aproximado de delivery",
      "cuánto demoran en entregar",
      "hora de entrega estimada",
      "plazo de entrega",
      "cuánto tiempo para recibir",
      "cuánto tarda el retiro",
      "en cuánto está listo para recoger",
    ],
  },
  {
    intent: "select_delivery_type",
    domain: "delivery",
    lang: "es",
    examples: [
      "quiero delivery express",
      "entrega estándar",
      "envío prioritario",
      "entrega programada",
      "delivery en el día",
      "entrega inmediata",
      "reparto urgente",
      "seleccionar tipo de reparto",
      "elegir velocidad de entrega",
      "delivery económico",
      "quiero retirar en tienda",
      "prefiero recoger personalmente",
      "entrega a domicilio",
      "recojo en el local",
    ],
  },
  {
    intent: "report_delivery_issue",
    domain: "delivery",
    lang: "es",
    examples: [
      "reportar problema con entrega",
      "no recibí mi pedido",
      "pedido incompleto",
      "producto dañado",
      "productos rotos",
      "repartidor no llegó",
      "entrega equivocada",
      "pedido tardó mucho",
      "reclamo por delivery",
      "problema con el repartidor",
      "problema con el retiro",
      "no estaba listo para recoger",
    ],
  },
];
