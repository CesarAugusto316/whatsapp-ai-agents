import { OperationMode } from "@/domain";
import { formatLocalDateTime } from "@/domain/utilities";
import {
  CustomerSignals,
  BookingState,
  BookingStatuses,
  CustomerSignalKey,
} from "@/domain/booking/booking.types";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";

/**
 * Configuración de verbos y acciones por dominio y modo de operación.
 * Extensible para futuros dominios.
 */
export const DOMAIN_ACTION_CONFIG: Record<
  SpecializedDomain,
  Record<
    OperationMode,
    {
      action: string;
      verb: string;
      verbInfinitive: string;
      process: string;
      title: string;
    }
  >
> = {
  // RESTAURANT - dominio principal implementado
  restaurant: {
    create: {
      action: "Hacer un pedido",
      verb: "creado",
      verbInfinitive: "crear",
      process: "creación",
      title: "pedido",
    },
    update: {
      action: "Modificar una reserva",
      verb: "actualizada",
      verbInfinitive: "actualizar",
      process: "actualización",
      title: "reserva",
    },
    cancel: {
      action: "Cancelar una reserva",
      verb: "cancelada",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "reserva",
    },
  },
  // MEDICAL - futuro
  medical: {
    create: {
      action: "Agendar una cita médica",
      verb: "agendada",
      verbInfinitive: "agendar",
      process: "agendamiento",
      title: "cita",
    },
    update: {
      action: "Modificar una cita",
      verb: "actualizada",
      verbInfinitive: "actualizar",
      process: "actualización",
      title: "cita",
    },
    cancel: {
      action: "Cancelar una cita",
      verb: "cancelada",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "cita",
    },
  },
  // REAL-ESTATE - futuro
  "real-estate": {
    create: {
      action: "Agendar una visita",
      verb: "agendada",
      verbInfinitive: "agendar",
      process: "agendamiento",
      title: "visita",
    },
    update: {
      action: "Modificar una visita",
      verb: "actualizada",
      verbInfinitive: "actualizar",
      process: "actualización",
      title: "visita",
    },
    cancel: {
      action: "Cancelar una visita",
      verb: "cancelada",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "visita",
    },
  },
  // EROTIC - futuro
  erotic: {
    create: {
      action: "Reservar una cita",
      verb: "reservada",
      verbInfinitive: "reservar",
      process: "reserva",
      title: "cita",
    },
    update: {
      action: "Modificar una cita",
      verb: "actualizada",
      verbInfinitive: "actualizar",
      process: "actualización",
      title: "cita",
    },
    cancel: {
      action: "Cancelar una cita",
      verb: "cancelada",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "cita",
    },
  },
  // RETAIL - futuro
  retail: {
    create: {
      action: "Agendar una cita",
      verb: "agendada",
      verbInfinitive: "agendar",
      process: "agendamiento",
      title: "cita",
    },
    update: {
      action: "Modificar una cita",
      verb: "actualizada",
      verbInfinitive: "actualizar",
      process: "actualización",
      title: "cita",
    },
    cancel: {
      action: "Cancelar una cita",
      verb: "cancelada",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "cita",
    },
  },
  // LEGAL - futuro
  legal: {
    create: {
      action: "Agendar una consulta",
      verb: "agendada",
      verbInfinitive: "agendar",
      process: "agendamiento",
      title: "consulta",
    },
    update: {
      action: "Modificar una consulta",
      verb: "actualizada",
      verbInfinitive: "actualizar",
      process: "actualización",
      title: "consulta",
    },
    cancel: {
      action: "Cancelar una consulta",
      verb: "cancelada",
      verbInfinitive: "cancelar",
      process: "cancelación",
      title: "consulta",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions - reutilizables para evitar código duplicado
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mensajes aleatorios para iniciar un pedido de comida
 * Cada mensaje confirma el inicio del proceso e invita al usuario a tomar acción
 */
const ORDER_START_MESSAGES: string[] = [
  "¡Perfecto! Empecemos tu pedido 🎉\n\n¿Quieres que te muestre el menú completo o prefieres buscar algo específico?",
  "¡Excelente! Vamos a armar tu pedido 🍽️\n\n¿Te gustaría ver el menú completo o buscar algún plato en particular?",
  "¡Genial! Ya estamos con tu pedido 👨‍🍳\n\n¿Quieres explorar el menú completo o buscar algo que te guste?",
  "¡Listo! Vamos con tu pedido 🎯\n\n¿Quieres ver el menú completo o tienes alguna preferencia (carne, pollo, etc.)?",
  "¡Fantástico! Iniciemos tu pedido 🌟\n\n¿Quieres que te muestre todas las opciones o prefieres buscar algún plato?",
  "¡De una! Empecemos con tu orden 🍴\n\n¿Te muestro el menú completo o quieres buscar algo en particular?",
  "¡Listo! Vamos con tu pedido 🎯\n\n¿Quieres ver el menú completo o prefieres buscar algo específico?",
  "¡Vamos allá! Iniciemos tu orden 🚀\n\n¿Prefieres explorar el menú o buscar algo que tengas en mente?",
  "¡Buena! Arranquemos con tu pedido 🍕\n\n¿Quieres que te pase el menú o prefieres buscar algún plato?",
  "¡Dale! Preparemos tu pedido 🥗\n\n¿Te muestro las opciones del menú o quieres buscar algo específico?",
  "¡Genial! Comencemos 🍜\n\n¿Quieres ver todo el menú o buscar algún plato en particular?",
  "¡Excelente! Empecemos 🌮\n\n¿Prefieres que te muestre el menú o buscar algo específico que te apetezca?",
];

/**
 * Mensaje para pedir datos de reserva (con o sin nombre previo)
 */
function createOrderMsg(
  domain: SpecializedDomain,
  mode: "create" | "update",
): string {
  const config = DOMAIN_ACTION_CONFIG[domain][mode];
  const randomIndex = Math.floor(Math.random() * ORDER_START_MESSAGES.length);
  return ORDER_START_MESSAGES[randomIndex];
}

/**
 * Mensaje de validación de datos (reutilizable para CREATE y UPDATE)
 */
function getValidationMsg(params: {
  domain: SpecializedDomain;
  mode: "create" | "update";
  data?: Partial<BookingState>;
  timeZone?: string;
}): string {
  const { domain, mode, data, timeZone } = params;
  const actionConfig = DOMAIN_ACTION_CONFIG[domain][mode];
  const { datetime } = data || {};
  const dateStart = formatLocalDateTime(datetime?.start, timeZone);
  const dateEnd = formatLocalDateTime(datetime?.end, timeZone);

  return `
       1.  Ya tenemos las datos listos para tu ${actionConfig.title} !!
       2.  Hemos CONFIRMADO que hay disponibilidad ✅.
       Por favor revisa antes de confirmar la ${actionConfig.process} de tu ${actionConfig.title}:

       👤 *Nombre*: ${data?.customerName}
       📆 Día : ${dateStart.date}
       ⏰ Hora de *entrada*: ${dateStart.time}
       ⏰ Hora de *salida*: ${dateEnd.time}
       👥 *Número de personas*: ${data?.numberOfPeople}

       Si los datos son correctos, escribe:
       ✅ *${CustomerSignals.CONFIRM}*

       Si deseas corregirlos, escribe:
       ✏️ *${CustomerSignals.RESTART}*

       Si no deseas continuar, escribe:
       🚪 *${CustomerSignals.EXIT}*
     `.trim();
}

/**
 * Mensaje de confirmación exitosa (reutilizable para CREATE y UPDATE)
 */
function getSuccessMsg(params: {
  domain: SpecializedDomain;
  mode: "create" | "update";
  data?: Partial<BookingState>;
  timeZone?: string;
}): string {
  const { domain, mode, data, timeZone } = params;
  const actionConfig = DOMAIN_ACTION_CONFIG[domain][mode];
  const { customerName, datetime, numberOfPeople } = data || {};
  const dateStart = formatLocalDateTime(datetime?.start, timeZone);
  const dateEnd = formatLocalDateTime(datetime?.end, timeZone);

  return `
       ✅ Tu ${actionConfig.title} ha sido ${actionConfig.verb} con éxito.

       👤 Nombre: ${customerName}
       📆 Día : ${dateStart.date}
       ⏰ Hora de *entrada*: ${dateStart.time}
       ⏰ Hora de *salida*: ${dateEnd.time}
       👥 Personas: ${numberOfPeople}

       🆔 ID de ${actionConfig.title}: ${data?.id}

       ⚠️ Guarda este ID.
       Para presentarla en el ${domain.toUpperCase()} el día de tu llegada.
     `.trim();
}

/**
 * Mensaje para mostrar reserva existente (reutilizable para UPDATE_STARTED y CANCEL_VALIDATED)
 */
function getExistingBookingMsg(params: {
  domain: SpecializedDomain;
  mode: "update" | "cancel";
  data?: Partial<BookingState>;
  timeZone?: string;
}): string {
  const { domain, mode, data, timeZone } = params;
  const { datetime } = data || {};
  const dateStart = formatLocalDateTime(datetime?.start, timeZone);
  const dateEnd = formatLocalDateTime(datetime?.end, timeZone);

  return `
       ✨ Hemos encontrado tu más reciente ${DOMAIN_ACTION_CONFIG[domain][mode].title}!

       👤 A *nombre* de: ${data?.customerName}
       📆 Día : ${dateStart.date}
       ⏰ Hora de *entrada*: ${dateStart.time}
       ⏰ Hora de *salida*: ${dateEnd.time}
       👥 Número de personas: ${data?.numberOfPeople}
    `.trim();
}

/**
 * Mensaje de salida (EXIT)
 * Independiente del dominio
 */
export function getBookingExitMsg(domain: SpecializedDomain): string {
  const title = domain ? DOMAIN_ACTION_CONFIG[domain].create.title : "reserva";

  return `
     Gracias por usar nuestro servicio 😊
     Recuerda que puedes elegir una de estas opciones en cualquier momento:

     1️⃣ ${DOMAIN_ACTION_CONFIG[domain].create.action}
     2️⃣ ${DOMAIN_ACTION_CONFIG[domain].update.action} ó
     3️⃣ ${DOMAIN_ACTION_CONFIG[domain].cancel.action}

     💬 Si tienes otra pregunta, escríbela directamente.
   `.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// State messages
// ─────────────────────────────────────────────────────────────────────────────

export const stateMessages = {
  [BookingStatuses.MAKE_STARTED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
  }): string {
    const { domain, data } = params;
    return createOrderMsg(domain, "create");
  },

  [BookingStatuses.MAKE_VALIDATED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
    timeZone?: string;
  }): string {
    return getValidationMsg({ ...params, mode: "create" });
  },

  [BookingStatuses.MAKE_CONFIRMED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
    timeZone?: string;
    signal: CustomerSignalKey;
  }): string {
    const { domain, data, timeZone, signal } = params;

    if (signal === "CONFIRMAR") {
      return getSuccessMsg({ domain, mode: "create", data, timeZone });
    }

    if (signal === "SALIR") {
      return getBookingExitMsg(domain);
    }

    // RESTART
    return createOrderMsg(domain, "update");
  },

  // UPDATE
  [BookingStatuses.UPDATE_STARTED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
    timeZone?: string;
  }): string {
    const { domain, data, timeZone } = params;
    const baseMsg = getExistingBookingMsg({
      domain,
      mode: "update",
      data,
      timeZone,
    });

    return `
       ${baseMsg}

       Si gustas cambiarla ayudanos con tus nuevos datos.
       Por ejemplo:
         "Para mañana a las 8pm para 4 personas"
     `.trim();
  },

  [BookingStatuses.UPDATE_VALIDATED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
    timeZone?: string;
  }): string {
    return getValidationMsg({ ...params, mode: "update" });
  },

  [BookingStatuses.UPDATE_CONFIRMED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
    timeZone?: string;
    signal: CustomerSignalKey;
  }): string {
    const { domain, data, timeZone, signal } = params;

    if (signal === "CONFIRMAR") {
      return getSuccessMsg({ domain, mode: "update", data, timeZone });
    }

    if (signal === "SALIR") {
      return getBookingExitMsg(domain);
    }

    // RESTART
    return createOrderMsg(domain, "update");
  },

  [BookingStatuses.CANCEL_VALIDATED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
    timeZone?: string;
  }): string {
    const { domain, data, timeZone } = params;
    const baseMsg = getExistingBookingMsg({
      domain,
      mode: "cancel",
      data,
      timeZone,
    });

    return `
       ${baseMsg}

       Si deseas cancelarla, escribe:
       🚪 ${CustomerSignals.CONFIRM}

       Así de simple 😉
     `.trim();
  },

  [BookingStatuses.CANCEL_CONFIRMED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
  }): string {
    const { domain, data } = params;

    return `
       ❌ Tu ${DOMAIN_ACTION_CONFIG[domain].cancel.title} ha sido ${DOMAIN_ACTION_CONFIG[domain].cancel.verb} con éxito.

       🆔 ID de ${DOMAIN_ACTION_CONFIG[domain].cancel.title}: ${data?.id}

       Esperamos verte pronto 😊
     `.trim();
  },
};
