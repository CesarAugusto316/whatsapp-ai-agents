import { formatLocalDateTime } from "@/domain/utilities";
import { CustomerSignals, BookingState } from "../../booking.types";
import { OperationMode } from "@/domain";

/**
 *
 * @todo add in prompts together with
 * @see CustomerSignals
 */
const ACTION_MODES = {
  create: {
    action: "Hacer una reserva",
    verb: "creada",
    verbInfinitive: "crear",
    process: "creación",
  },
  update: {
    action: "Modificar una reserva",
    verb: "actualizada",
    verbInfinitive: "actualizar",
    process: "actualización",
  },
  cancel: {
    action: "Modificar una reserva",
    verb: "actualizada",
    verbInfinitive: "actualizar",
    process: "actualización",
  },
} as const;

/**
 *
 * @description deterministic messages sent to the user
 */
export const systemMessages = {
  getCreateMsg({ userName }: { userName?: string }) {
    if (userName) {
      return `
         ✌🏽Para crear tu reserva es muy simple, comentame:
         el *día*, la *hora* y *cuántas personas* serán.

         Por ejemplo:
           "El 25 de diciembre a las 7pm para 2 personas"
           "Mañana a las 8pm para 4 personas"
       `.trim();
    }

    return `
       👌Para crear tu reserva es muy fácil, ayudame con:
       *tu nombre*, el *día*, la *hora* y *cuántas personas* serán.

       Por ejemplo:
         "Juan Pérez, el 25 de diciembre a las 7pm para 2 personas"
         "A nombre de María Rodríguez, mañana a las 8pm para 4 personas"
     `.trim();
  },

  getConfirmationMsg(
    data: Partial<BookingState>,
    mode: OperationMode = "create",
    timeZone?: string,
  ) {
    const copy = ACTION_MODES[mode];
    const { datetime } = data;
    const dateStart = formatLocalDateTime(datetime?.start, timeZone);
    const dateEnd = formatLocalDateTime(datetime?.end, timeZone);
    return `
       1.  Ya tenemos las datos listos para tu reserva !!
       2.  Hemos CONFIRMADO que hay disponibilidad ✅.
       Por favor revisa antes de confirmar la ${copy.process} de tu reserva:

       👤 *Nombre*: ${data?.customerName}
       📆 Día : ${dateStart.date}
       ⏰ Hora de *entrada*: ${dateStart.time}
       ⏰ Hora de *salida*: ${dateEnd.time}
       👥 *Número de personas*: ${data.numberOfPeople}

       Si los datos son correctos, escribe:
       ✅ *${CustomerSignals.CONFIRM}*

       Si deseas corregirlos, escribe:
       ✏️ *${CustomerSignals.RESTART}*

       Si no deseas continuar, escribe:
       🚪 *${CustomerSignals.EXIT}*
     `.trim();
  },

  getUpdateMsg(data: Partial<BookingState>, timeZone?: string) {
    const { datetime } = data;
    const dateStart = formatLocalDateTime(datetime?.start, timeZone);
    const dateEnd = formatLocalDateTime(datetime?.end, timeZone);
    return `
       ✨ Hemos encontrado tu más reciente reserva!

       👤 A *nombre* de: ${data?.customerName}
       📆 Día : ${dateStart.date}
       ⏰ Hora de *entrada*: ${dateStart.time}
       ⏰ Hora de *salida*: ${dateEnd.time}
       👥 *Número de personas*: ${data.numberOfPeople}

       Si gustas cambiarla ayudanos con tus nuevos datos.
       Por ejemplo:
         "Para mañana a las 8pm para 4 personas"

       Así de simple 😊
     `.trim();
  },

  getCancelMsg(data: Partial<BookingState>, timeZone?: string) {
    const { datetime } = data;
    const dateStart = formatLocalDateTime(datetime?.start, timeZone);
    const dateEnd = formatLocalDateTime(datetime?.end, timeZone);
    return `
       ✨ Hemos encontrado tu más reciente reserva!

       👤 A *nombre* de: ${data?.customerName}
       📆 Día : ${dateStart.date}
       ⏰ Hora de *entrada*: ${dateStart.time}
       ⏰ Hora de *salida*: ${dateEnd.time}
       👥 Número de personas: ${data.numberOfPeople}

       Si deseas cancelarla, escribe:
       🚪 ${CustomerSignals.CONFIRM}

       Así de simple 😉
     `.trim();
  },

  /**
   *
   * @todo SIMPLIFICAR ESTOS ARGUMENTOS
   */
  getSuccessMsg(
    appointment: Partial<BookingState>,
    mode: OperationMode = "create",
    timeZone?: string,
  ): string {
    const { customerName, datetime, numberOfPeople } = appointment;
    const copy = ACTION_MODES[mode];
    const dateStart = formatLocalDateTime(datetime?.start, timeZone);
    const dateEnd = formatLocalDateTime(datetime?.end, timeZone);
    return `
       ✅ Tu reserva ha sido ${copy.verb} con éxito.

       👤 Nombre: ${customerName}
       📆 Día : ${dateStart.date}
       ⏰ Hora de *entrada*: ${dateStart.time}
       ⏰ Hora de *salida*: ${dateEnd.time}
       👥 Personas: ${numberOfPeople}

       🆔 ID de reserva: ${appointment.id}

       ⚠️ Guarda este ID.
       Para presentarla en el RESTAURANT el día de tu llegada 🍽️.
     `.trim();
  },

  getExitMsg() {
    return `
       Gracias por usar nuestro servicio 😊
       Recuerda que puedes elegir una de estas opciones en cualquier momento:

       1️⃣ Hacer una reserva
       2️⃣ Modificar una reserva existente ó
       3️⃣ Cancelar

       💬 Si tienes otra pregunta, escríbela directamente.
     `;
  },
};
