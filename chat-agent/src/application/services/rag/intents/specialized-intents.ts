import { SemanticIntent } from "@/application/services/rag";

export type SpecializedDomain =
  | "restaurant"
  | "real-state"
  | "erotic"
  | "booking";

export type SharedIntentKey =
  | "request_menu"
  | "start_order"
  | "ask_information"
  | "confirm_order"
  | "request_media";

export type BookingIntentKey =
  | "create_booking"
  | "modify_booking"
  | "cancel_booking"
  | "ask_for_availability";

export type SpecializedSemanticIntent = SemanticIntent<
  SharedIntentKey | BookingIntentKey,
  SpecializedDomain
>;

export const bookingIntents: SpecializedSemanticIntent[] = [
  {
    intent: "create_booking",
    domain: "booking",
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
    domain: "booking",
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
    domain: "booking",
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
    domain: "booking",
    lang: "es",
    examples: [
      "hay disponibilidad",
      "qué horarios/espacios están libres",
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

export const restaurantIntents: SpecializedSemanticIntent[] = [
  {
    intent: "request_menu",
    domain: "restaurant",
    lang: "es",
    examples: [
      "¿qué venden?",
      "puedo ver el menú",
      "muéstrame las opciones",
      "qué platos tienen hoy",
      "me puedes compartir el menú",
      "qué hay para comer",
      "qué ofrecen",
      "quiero ver el menú",
      "tienen carta",
      "qué comidas manejan",
      "me interesa saber qué venden",
      "qué puedo pedir aquí",
      "qué opciones hay disponibles",
      "menu por favor",
      "me pasas el menú",
      "qué tienen para hoy",
    ],
  },

  {
    intent: "start_order",
    domain: "restaurant",
    lang: "es",
    examples: [
      "quiero hacer un pedido",
      "deseo ordenar",
      "voy a pedir algo",
      "quiero comprar comida",
      "me gustaría ordenar",
      "vamos a pedir",
      "quiero empezar un pedido",
      "quisiera hacer una orden",
      "quiero realizar un pedido",
      "quiero pedir ahora",
      "listo para ordenar",
      "quiero comprar",
      "vamos con el pedido",
      "quiero hacer mi pedido",
      "me ayudas a pedir",
    ],
  },

  {
    intent: "ask_information",
    domain: "restaurant",
    lang: "es",
    examples: [
      "¿cuánto tarda?",
      "en cuánto tiempo llega",
      "cuánto demora la comida",
      "más o menos a qué hora estaría",
      "cuánto tiempo toma la preparación",
      "en qué estado viene el pedido",
      "llega caliente",
      "cómo entregan la comida",
      "cuánto falta",
      "qué tiempo de espera hay",
      "ya casi está",
      "cuánto se demora el delivery",
      "cuánto tarda en cocinarse",
      "me puedes decir el tiempo aproximado",
      "más o menos cuánto hay que esperar",
      "cómo funciona la entrega",
      "cómo llega el pedido",
      "cuánto se demora en llegar",
      "tarda mucho",
      "qué tan rápido entregan",
      "cuál es el tiempo estimado",
      "a qué hora estaría listo",
      "cuánto tarda normalmente",
      "en cuánto estaría mi pedido",
      "una pregunta, cuánto demora",
    ],
  },

  {
    intent: "confirm_order",
    domain: "restaurant",
    lang: "es",
    examples: [
      "confirmo",
      "está bien así",
      "ok confirmado",
      "dale",
      "sí, adelante",
      "todo bien",
      "perfecto",
      "listo",
      "así está bien",
      "puedes proceder",
      "haz el pedido",
      "confirmado",
      "sí, envíalo",
      "continuemos",
      "ok",
    ],
  },
];

export const eroticIntents: SpecializedSemanticIntent[] = [
  {
    intent: "request_media",
    domain: "erotic",
    lang: "es",
    examples: [
      "quiero ver tus fotos",
      "muéstrame tu contenido",
      "ver tus videos",
      "qué contenido ofreces",
      "ver tus packs",
      "explorar tu galería",
      "quiero ver más de ti",
      "mostrar todo lo que tienes",
      "ver tu perfil completo",
    ],
  },
  {
    intent: "start_order",
    domain: "erotic",
    lang: "es",
    examples: [
      "quiero comprar esta foto",
      "quiero este pack",
      "me gustaría comprar un video",
      "quiero adquirir tu contenido",
      "quiero hacer un pedido",
      "quiero comprar ahora",
      "quiero comprar este pack de fotos",
      "quiero este contenido",
      "quiero empezar mi pedido",
    ],
  },
  {
    intent: "ask_information",
    domain: "erotic",
    lang: "es",
    examples: [
      "haces videollamadas?",
      "ofreces contenido personalizado?",
      "qué modalidades tienes",
      "cuáles son tus horarios",
      "cómo entregas el contenido",
      "tienes packs especiales",
      "cómo puedo recibir el contenido",
      "cuánto cuesta una sesión",
      "tienes promociones",
    ],
  },
  {
    intent: "confirm_order",
    domain: "erotic",
    lang: "es",
    examples: [
      "confirmo",
      "está bien así",
      "ok confirmado",
      "dale",
      "sí, adelante",
      "perfecto",
      "listo",
      "puedes proceder",
      "sí, envíalo",
      "continuemos",
    ],
  },
];
