import { SemanticIntent } from "@/application/services/rag";

export type TransversalIntentKey =
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
  | "ask_for_availability";

export type CoreDomain = "bookings" | "global";

export type GlobalSemanticIntent = SemanticIntent<
  TransversalIntentKey | BookingIntentKey,
  CoreDomain
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
      "quiero hacer una reserva",
      "me gustaría agendar una cita",
      "necesito apartar un espacio para mañana",
      "quisiera reservar para dos personas esta noche",
      "puedes ayudarme a sacar una cita",
      "quiero una habitación para el viernes",
      "busco agendar una visita",
      "quiero programar una reunión",
      "necesito reservar un cupo",
      "me puedes registrar una reserva",
      "estoy buscando apartar un horario",
      "quiero coordinar una cita",
      "hay forma de reservar ahora",
      "me interesa separar un espacio",
      "quiero hacer una reservación para más tarde",
      "necesito agendar algo",
      "quiero programar una visita",
      "quiero asegurar un lugar",
    ],
  },

  {
    intent: "modify_booking",
    domain: "bookings",
    lang: "es",
    examples: [
      "quiero cambiar mi reserva",
      "necesito mover la cita para más tarde",
      "puedo cambiar la hora",
      "quiero modificar la fecha",
      "me equivoqué al reservar",
      "hay forma de reprogramar",
      "puedo actualizar mi booking",
      "quiero cambiar el día",
      "puedes ajustar mi reservación",
      "quiero adelantar la cita",
      "quiero atrasarla media hora",
      "necesito corregir mi reserva",
      "quiero editar la cita",
      "puedo moverla para mañana",
      "quiero cambiar algunos datos de la reserva",
    ],
  },

  {
    intent: "cancel_booking",
    domain: "bookings",
    lang: "es",
    examples: [
      "quiero cancelar",
      "ya no voy a poder asistir",
      "puedes eliminar mi reserva",
      "necesito anular la cita",
      "quiero cancelar todo",
      "ya no la necesito",
      "puedes borrar la reservación",
      "no voy a llegar",
      "quiero dar de baja la cita",
      "me surgió algo, cancela por favor",
      "quiero cancelar lo que agendé",
      "ya no quiero la reserva",
    ],
  },

  {
    intent: "ask_for_availability",
    domain: "bookings",
    lang: "es",
    examples: [
      "hay disponibilidad",
      "qué horarios están libres",
      "tienen espacio hoy",
      "hay cupos mañana",
      "hay algo para esta tarde",
      "qué días tienen disponibles",
      "queda algún horario",
      "hay mesas libres",
      "tienen habitaciones disponibles",
      "hay espacio para dos personas",
      "puedo agendar algo ahora",
      "qué opciones hay",
      "hay algo abierto",
      "qué horas están disponibles",
      "me puedes decir si hay disponibilidad",
    ],
  },
];
