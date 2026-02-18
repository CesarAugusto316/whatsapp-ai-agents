import { formatLocalDateTime } from "@/domain/utilities";
import { CustomerSignals, BookingState } from "@/domain/booking/booking.types";
import { SpecializedDomain } from "@/infraestructure/adapters/cms";
import { BookingStatus } from "@/domain/booking";

export type OperationMode = "create" | "update" | "cancel";
export type BookingOperationMode = "create" | "update";

/**
 * Configuración de mensajes por estado y dominio.
 *
 * ARQUITECTURA:
 * - Los mensajes se disparan después de una transición de estado
 * - Cada dominio tiene su propio vocabulario (restaurant, medical, etc.)
 * - Los templates son determinísticos (fácilmente convertibles a prompts en el futuro)
 *
 * EJEMPLOS DE USO:
 * - restaurant + MAKE_STARTED → "✌🏽 Para crear tu reserva..."
 * - medical + MAKE_STARTED → "👋 Para agendar tu cita..."
 */
interface DomainMessageConfig {
  domain: SpecializedDomain;
  mode: OperationMode;
}

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

/**
 * Obtiene la configuración de acción para un dominio y modo específicos.
 */
function getActionConfig(domain: SpecializedDomain, mode: OperationMode) {
  return DOMAIN_ACTION_CONFIG[domain][mode];
}

/**
 * Templates de mensajes determinísticos para transiciones de estado en booking.
 *
 * @param status - El estado actual después de la transición
 * @param config - Configuración con dominio, modo y datos opcionales
 * @returns Mensaje template listo para ser humanizado
 */
export function getBookingStateMessage(
  status: BookingStatus,
  config: {
    domain: SpecializedDomain;
    mode?: OperationMode;
    data?: Partial<BookingState>;
    timeZone?: string;
    userName?: string;
  },
): string | undefined {
  const { domain, mode = "create", data, timeZone, userName } = config;

  switch (status) {
    case "MAKE_STARTED":
      return getBookingStartedMsg({ domain, mode, userName });

    case "MAKE_VALIDATED":
      return getBookingConfirmationMsg({ domain, mode, data, timeZone });

    case "MAKE_CONFIRMED":
      return getBookingSuccessMsg({ domain, mode, data, timeZone });

    case "UPDATE_STARTED":
      return getUpdateStartedMsg({ domain, data, timeZone });

    case "UPDATE_VALIDATED":
      return getBookingConfirmationMsg({
        domain,
        mode: "update",
        data,
        timeZone,
      });

    case "UPDATE_CONFIRMED":
      return getBookingSuccessMsg({ domain, mode: "update", data, timeZone });

    case "CANCEL_VALIDATED":
      return getCancelValidationMsg({ domain, data, timeZone });

    case "CANCEL_CONFIRMED":
      return getCancelSuccessMsg({ domain, data });

    default:
      return undefined;
  }
}

/**
 * Mensaje para MAKE_STARTED / UPDATE_STARTED
 * Se dispara cuando el usuario inicia el flujo de reserva
 */
function getBookingStartedMsg(params: {
  domain: SpecializedDomain;
  mode: OperationMode;
  userName?: string;
}): string {
  const { domain, mode, userName } = params;

  if (mode === "update") {
    return `
       ✨ Hemos encontrado tu más reciente ${DOMAIN_ACTION_CONFIG[domain].update.title}!

       👤 A *nombre* de: ${userName || "tu reserva"}

       Si gustas cambiarla ayudanos con tus nuevos datos.
       Por ejemplo:
         "Para mañana a las 8pm para 4 personas"

       Así de simple 😊
     `.trim();
  }

  // CREATE mode
  if (userName) {
    return `
       ✌🏽 Para ${DOMAIN_ACTION_CONFIG[domain].create.verbInfinitive} tu ${DOMAIN_ACTION_CONFIG[domain].create.title} es muy simple, comentame:
       el *día*, la *hora* y *cuántas personas* serán.

       Por ejemplo:
         "El 25 de diciembre a las 7pm para 2 personas"
         "Mañana a las 8pm para 4 personas"
     `.trim();
  }

  return `
     👌 Para ${DOMAIN_ACTION_CONFIG[domain].create.verbInfinitive} tu ${DOMAIN_ACTION_CONFIG[domain].create.title} es muy fácil, ayudame con:
     *tu nombre*, el *día*, la *hora* y *cuántas personas* serán.

     Por ejemplo:
       "Juan Pérez, el 25 de diciembre a las 7pm para 2 personas"
       "A nombre de María Rodríguez, mañana a las 8pm para 4 personas"
   `.trim();
}

/**
 * Mensaje para MAKE_VALIDATED / UPDATE_VALIDATED
 * Se dispara cuando los datos están completos y validados, esperando confirmación
 */
function getBookingConfirmationMsg(params: {
  domain: SpecializedDomain;
  mode: OperationMode;
  data?: Partial<BookingState>;
  timeZone?: string;
}): string {
  const { domain, mode, data, timeZone } = params;
  const actionConfig = getActionConfig(domain, mode);
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
 * Mensaje para MAKE_CONFIRMED / UPDATE_CONFIRMED
 * Se dispara cuando la reserva fue confirmada exitosamente
 */
function getBookingSuccessMsg(params: {
  domain: SpecializedDomain;
  mode: OperationMode;
  data?: Partial<BookingState>;
  timeZone?: string;
}): string {
  const { domain, mode, data, timeZone } = params;
  const actionConfig = getActionConfig(domain, mode);
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
     Para presentarla en el ${domain.toUpperCase()} el día de tu llegada 🍽️.
   `.trim();
}

/**
 * Mensaje específico para UPDATE_STARTED
 * Muestra la reserva existente y pide nuevos datos
 */
function getUpdateStartedMsg(params: {
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

     Así de simple 😊
   `.trim();
}

/**
 * Mensaje para CANCEL_VALIDATED
 * Muestra la reserva y pide confirmación de cancelación
 */
function getCancelValidationMsg(params: {
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
}

/**
 * Mensaje para CANCEL_CONFIRMED
 * Confirma que la reserva fue cancelada
 */
function getCancelSuccessMsg(params: {
  domain: SpecializedDomain;
  data?: Partial<BookingState>;
}): string {
  const { domain, data } = params;

  return `
     ❌ Tu ${DOMAIN_ACTION_CONFIG[domain].cancel.title} ha sido ${DOMAIN_ACTION_CONFIG[domain].cancel.verb} con éxito.

     🆔 ID de ${DOMAIN_ACTION_CONFIG[domain].cancel.title}: ${data?.id}

     Esperamos verte pronto 😊
   `.trim();
}

/**
 * Mensaje de salida (EXIT)
 * Independiente del dominio
 */
export function getBookingExitMsg(domain?: SpecializedDomain): string {
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
