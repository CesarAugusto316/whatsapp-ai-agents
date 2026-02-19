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
const DOMAIN_ACTION_CONFIG: Record<
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
      action: "Hacer una reserva",
      verb: "creada",
      verbInfinitive: "crear",
      process: "creación",
      title: "reserva",
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

export const stateMessages = {
  [BookingStatuses.MAKE_STARTED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
  }): string {
    const { domain, data } = params;

    // CREATE mode
    if (data?.customerName) {
      return `
         Para ${DOMAIN_ACTION_CONFIG[domain].create.verbInfinitive} tu ${DOMAIN_ACTION_CONFIG[domain].create.title} comentame:
         el *día*, la *hora* y *cuántas personas* serán.

         Por ejemplo:
           "Mañana a las 8pm para 4 personas"
       `.trim();
    }

    return `
       Para ${DOMAIN_ACTION_CONFIG[domain].create.verbInfinitive} tu ${DOMAIN_ACTION_CONFIG[domain].create.title} es muy fácil, ayudame con:
       *tu nombre*, el *día*, la *hora* y *cuántas personas* serán.

       Por ejemplo:
         "A nombre de María Rodríguez, mañana a las 8pm para 4 personas"
     `.trim();
  },
  [BookingStatuses.MAKE_VALIDATED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
    timeZone?: string;
  }): string {
    const { domain, data, timeZone } = params;
    const actionConfig = DOMAIN_ACTION_CONFIG[domain]["create"];
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
  },
  [BookingStatuses.MAKE_CONFIRMED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
    timeZone?: string;
    signal: CustomerSignalKey;
  }): string {
    const { domain, data, timeZone, signal } = params;
    const actionConfig = DOMAIN_ACTION_CONFIG[domain]["create"];
    const { customerName, datetime, numberOfPeople } = data || {};
    const dateStart = formatLocalDateTime(datetime?.start, timeZone);
    const dateEnd = formatLocalDateTime(datetime?.end, timeZone);

    if (signal === "CONFIRMAR") {
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
    if (signal === "SALIR") {
      return getBookingExitMsg(domain);
    }

    // RESTART
    if (data?.customerName) {
      return `
         Para ${DOMAIN_ACTION_CONFIG[domain].update.verbInfinitive} tu ${DOMAIN_ACTION_CONFIG[domain].update.title} comentame:
         el *día*, la *hora* y *cuántas personas* serán.

         Por ejemplo:
           "Mañana a las 8pm para 4 personas"
       `.trim();
    }

    return `
       Para ${DOMAIN_ACTION_CONFIG[domain].update.verbInfinitive} tu ${DOMAIN_ACTION_CONFIG[domain].update.title} es muy fácil, ayudame con:
       *tu nombre*, el *día*, la *hora* y *cuántas personas* serán.

       Por ejemplo:
         "A nombre de María Rodríguez, mañana a las 8pm para 4 personas"
     `.trim();
  },

  // UPDATE
  [BookingStatuses.UPDATE_STARTED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
    timeZone?: string;
  }): string {
    const { domain, data, timeZone } = params;
    const { datetime } = data || {};
    const dateStart = formatLocalDateTime(datetime?.start, timeZone);
    const dateEnd = formatLocalDateTime(datetime?.end, timeZone);

    return `
       ✨ Hemos encontrado tu más reciente ${DOMAIN_ACTION_CONFIG[domain].update.title}!

       👤 A *nombre* de: ${data?.customerName}
       📆 Día : ${dateStart.date}
       ⏰ Hora de *entrada*: ${dateStart.time}
       ⏰ Hora de *salida*: ${dateEnd.time}
       👥 *Número de personas*: ${data?.numberOfPeople}

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
    const { domain, data, timeZone } = params;
    const actionConfig = DOMAIN_ACTION_CONFIG[domain]["update"];
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
  },
  [BookingStatuses.UPDATE_CONFIRMED]: function (params: {
    domain: SpecializedDomain;
    mode: OperationMode;
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
  },

  [BookingStatuses.CANCEL_VALIDATED]: function (params: {
    domain: SpecializedDomain;
    data?: Partial<BookingState>;
    timeZone?: string;
  }): string {
    const { domain, data, timeZone } = params;
    const { datetime } = data || {};
    const dateStart = formatLocalDateTime(datetime?.start, timeZone);
    const dateEnd = formatLocalDateTime(datetime?.end, timeZone);

    return `
       ✨ Hemos encontrado tu más reciente ${DOMAIN_ACTION_CONFIG[domain].cancel.title}!

       👤 A *nombre* de: ${data?.customerName}
       📆 Día : ${dateStart.date}
       ⏰ Hora de *entrada*: ${dateStart.time}
       ⏰ Hora de *salida*: ${dateEnd.time}
       👥 Número de personas: ${data?.numberOfPeople}

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

/**
 * Mensaje de salida (EXIT)
 * Independiente del dominio
 */
function getBookingExitMsg(domain: SpecializedDomain): string {
  const title = domain ? DOMAIN_ACTION_CONFIG[domain].create.title : "reserva";

  return `
     Gracias por usar nuestro servicio 😊
     Recuerda que puedes elegir una de estas opciones en cualquier momento:

     1️⃣ ${DOMAIN_ACTION_CONFIG[domain || "restaurant"].create.action}
     2️⃣ ${DOMAIN_ACTION_CONFIG[domain || "restaurant"].update.action} ó
     3️⃣ ${DOMAIN_ACTION_CONFIG[domain || "restaurant"].cancel.action}

     💬 Si tienes otra pregunta, escríbela directamente.
   `.trim();
}
