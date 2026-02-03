export type BookingIntentKey =
  | "create_booking"
  | "modify_booking"
  | "cancel_booking"
  | "check_availability"
  | "ask_business_hours"
  | "ask_location"
  | "ask_pricing"
  | "provide_booking_details"
  | "confirm_booking"
  | "greeting"
  | "goodbye";

export type Domain = "bookings" | "ecommerce";

export interface SemanticIntent {
  intent: BookingIntentKey; // BookingIntentKey | EcommerceKey
  domain: Domain;
  language: "es" | "en";
  examples: string[];
}

export const bookingIntents: SemanticIntent[] = [
  {
    intent: "create_booking",
    domain: "bookings",
    language: "es",
    examples: [
      "quiero reservar",
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
    language: "es",
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
    language: "es",
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
    language: "es",
    examples: [
      "hay disponibilidad",
      "tienen espacio hoy",
      "hay cupos mañana",
      "qué horarios están libres",
      "tienen mesas disponibles",
      "hay habitaciones libres",
    ],
  },

  {
    intent: "ask_business_hours",
    domain: "bookings",
    language: "es",
    examples: [
      "a qué hora abren",
      "a qué hora cierran",
      "cuál es el horario",
      "están abiertos hoy",
      "horarios de atención",
    ],
  },

  {
    intent: "ask_location",
    domain: "bookings",
    language: "es",
    examples: [
      "dónde quedan",
      "cuál es la dirección",
      "cómo llego",
      "ubicación del local",
      "en qué parte están",
    ],
  },

  {
    intent: "ask_pricing",
    domain: "bookings",
    language: "es",
    examples: [
      "cuánto cuesta",
      "precio de la reserva",
      "tarifas",
      "valor por noche",
      "cuánto vale",
    ],
  },

  {
    intent: "provide_booking_details",
    domain: "bookings",
    language: "es",
    examples: [
      "somos dos personas",
      "para mañana a las ocho",
      "mi nombre es Carlos",
      "sería para el viernes",
      "una habitación doble",
      "mesa para cuatro",
    ],
  },

  {
    intent: "confirm_booking",
    domain: "bookings",
    language: "es",
    examples: [
      "sí confirmo",
      "está bien así",
      "confirmado",
      "dale",
      "perfecto",
    ],
  },

  {
    intent: "greeting",
    domain: "bookings",
    language: "es",
    examples: ["hola", "buenas", "buen día", "buenas tardes", "qué tal"],
  },

  {
    intent: "goodbye",
    domain: "bookings",
    language: "es",
    examples: ["gracias", "hasta luego", "nos vemos", "chau", "muchas gracias"],
  },
];
