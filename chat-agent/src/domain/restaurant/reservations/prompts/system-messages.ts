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
    return `
       Este es un mensaje inicial, además de responder a mi pregunta debes saludarme,
       presentarte brevemente y explicarme:
        - Cómo hacer una reserva de forma facil y simple.

       ${customerName ? `Mi nombre es ${customerName}` : ""}

       Esta es mi pregunta:
       - ${message}
     `.trim();
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
  ) {
    const copy = ACTION_MODES[mode];
    const { datetime } = data;
    return `
       1.  Ya tenemos las datos listos para tu reserva !!
       2.  Hemos CONFIRMADO que hay disponibilidad ✅.
       Por favor revisa antes de confirmar la ${copy.process} de tu reserva:

       👤 *Nombre*: ${data?.customerName}
       📆 Día : ${datetime?.start.date}
       ⏰ Hora de *entrada*: ${datetime?.start.time}
       ⏰ Hora de *salida*: ${datetime?.end.time}
       👥 *Número de personas*: ${data.numberOfPeople}

       Si los datos son correctos, escribe:
       ✅ ${CustomerActions.CONFIRM}

       Si deseas corregirlos, escribe:
       ✏️ ${CustomerActions.RESTART}

       Si no deseas continuar, escribe:
       🚪 ${CustomerActions.EXIT}
     `.trim();
  },

  getUpdateMsg(data: Partial<ReservationState>) {
    const { datetime } = data;
    return `
       ✨ Hemos encontrado tu más reciente reserva!

       👤 A *nombre* de: ${data?.customerName}
       📆 Día : ${datetime?.start.date}
       ⏰ Hora de *entrada*: ${datetime?.start.time}
       ⏰ Hora de *salida*: ${datetime?.end.time}
       👥 *Número de personas*: ${data.numberOfPeople}

       Si gustas cambiarla ayudanos con tus nuevos datos.
       Por ejemplo:
         "Para mañana a las 8pm para 4 personas"

       Así de simple 😊
     `.trim();
  },

  getCancelMsg(data: Partial<ReservationState>) {
    const { datetime } = data;
    return `
       ✨ Hemos encontrado tu más reciente reserva!

       👤 A *nombre* de: ${data?.customerName}
       📆 Día : ${datetime?.start.date}
       ⏰ Hora de *entrada*: ${datetime?.start.time}
       ⏰ Hora de *salida*: ${datetime?.end.time}
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
  ): string {
    const { customerName, datetime, numberOfPeople } = appointment;
    const copy = ACTION_MODES[mode];

    return `
       ✅ Tu reserva ha sido ${copy.verb} con éxito.

       👤 Nombre: ${customerName}
       📆 Día : ${datetime?.start.date}
       ⏰ Hora de *entrada*: ${datetime?.start.time}
       ⏰ Hora de *salida*: ${datetime?.end.time}
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
