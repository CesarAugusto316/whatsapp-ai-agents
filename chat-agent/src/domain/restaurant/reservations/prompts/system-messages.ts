import { formatLocalDateTime } from "@/domain/utilities";
import { CustomerActions, ReservationState } from "../reservation.types";

export type ReservationMode = "create" | "update";

/**
 *
 * @todo add in prompts together with
 * @see CustomerActions
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
} as const;

/**
 *
 * @description deterministic messages sent to the user
 */
export const systemMessages = {
  //
  initialGreeting(message: string, customerName?: string) {
    const messageV1 = `
       Este es un mensaje inicial, además de responder a mi pregunta debes saludarme,
       presentarte brevemente y explicarme:
        - Cómo hacer una reserva de forma facil y simple.

       ${customerName ? `Mi nombre es ${customerName}` : ""}

       Esta es mi pregunta:
       - ${message}
     `.trim();

    const messageV2 = `
      Este es un mensaje inicial, además de responder a mi pregunta debes saludarme y
      presentarte brevemente.

      ${customerName ? `Mi nombre es ${customerName}` : ""}

      Esta es mi pregunta:
      - ${message}

      Al final de tu mensaje de respuesta debes preguntarme como puedes ayudarme HOY
      o que otra cosa se me ofrece dependiendo de lo que necesite.
    `.trim();
    return messageV2;
  },

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
    data: Partial<ReservationState>,
    mode: ReservationMode = "create",
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
       ✅ *${CustomerActions.CONFIRM}*

       Si deseas corregirlos, escribe:
       ✏️ *${CustomerActions.RESTART}*

       Si no deseas continuar, escribe:
       🚪 *${CustomerActions.EXIT}*
     `.trim();
  },

  getUpdateMsg(data: Partial<ReservationState>, timeZone?: string) {
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

  getCancelMsg(data: Partial<ReservationState>, timeZone?: string) {
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
       🚪 ${CustomerActions.CONFIRM}

       Así de simple 😉
     `.trim();
  },

  /**
   *
   * @todo SIMPLIFICAR ESTOS ARGUMENTOS
   */
  getSuccessMsg(
    appointment: Partial<ReservationState>,
    mode: ReservationMode = "create",
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
