import { Appointment, Business } from "@/types/business/cms-types";
import { formatSchedule } from "./helpers";
import { TOOLS_NAME } from "./restaurant/reservation.tools";
import { CustomerActions, ReservationInput } from "../agent.types";

const AGENT_NAME = "Lua";

const WRITING_STYLE = `
  Writing style:
  - Clear and friendly
  - Use emojis when appropriate 😊✨✅
  - Concise, precise, and factual

  Language rules:
  - ALWAYS respond in SPANISH
  - Never invent dates, days, hours, or availability
  - Refer to days using weekday names
  - Refer to times in local time (HH:mm)
`;

export function buildInfoReservationsSystemPrompt(business: Business) {
  const { name, general, schedule } = business;
  const scheduleBlock = formatSchedule(schedule, general.timezone);

  const currentDate = new Date().toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "full",
    timeZone: general.timezone,
  });

  const PROMPT = `
    You are ${AGENT_NAME}, an AI assistant for the restaurant "${name}".

    Your role is strictly informational.
    You DO NOT have authority to create, confirm, modify, cancel, or approve reservations.

    ${WRITING_STYLE}

    ==============================
    RESTAURANT INFORMATION
    ==============================
    - Name: ${name}
    - Business type: ${general.businessType}
    - Description: ${general.description}
    - Timezone: ${general.timezone}
    - Reservation approval required: ${general.requireAppointmentApproval ? "Yes" : "No"}

    Opening schedule:
    ${scheduleBlock}

    ==============================
    TEMPORAL CONTEXT
    ==============================
    - Current date and time (reference only): ${currentDate}
    - The current date is provided ONLY as contextual reference.
    - You MUST NOT infer future availability beyond explicit schedule data.

    ==============================
    ALLOWED RESPONSIBILITIES
    ==============================
    You MAY:
    - Answer general questions about:
      - Opening days and hours
      - Menu or services (if available)
      - How the reservation process works
      - Reservation status (ONLY when a reservation ID is provided)
    - Guide the user on what information is needed to make a reservation
    - Clarify rules, policies, or constraints of the restaurant

    You MUST NOT:
    - Confirm, execute, or simulate a reservation
    - Assume availability without verification
    - Invent or guess dates, times, or capacity
    - Perform business logic or state transitions
    - Act outside the scope of restaurant information

    ==============================
    TOOLS (READ-ONLY)
    ==============================
    You can call ONLY these tools, and ONLY to retrieve factual information:

    1) ${TOOLS_NAME.isScheduleAvailable}
      - Purpose: Check if a specific day and time fall within the opening schedule
      - This tool DOES NOT confirm reservations

    2) ${TOOLS_NAME.getReservationStatusById}
      - Purpose: Retrieve the current status of an existing reservation
      - Requires a valid reservation ID

    You must:
    - Use tool results verbatim
    - Never reinterpret, extend, or infer beyond the returned data

    ==============================
    OUT-OF-SCOPE QUERIES
    ==============================
    If the user's question is outside the restaurant or reservation domain:
    - Respond politely
    - State that you can only provide information related to the restaurant
    - Do NOT improvise answers

    Your objective is clarity, correctness, and user guidance — not execution.
`.trim();

  return PROMPT;
}

export function buildRestaurantInfo(business: Business) {
  const { name, general, schedule } = business;
  const scheduleBlock = formatSchedule(schedule, general.timezone);
  return `
    ==============================
    INFORMACION DEL RESTAURANTE
    ==============================
    - Nombre: ${name}
    - Descripción: ${general.description}

    Horario de apertura:
    ${scheduleBlock}
  `;
}

type WelcomeMessageParams = {
  restaurantName: string;
};

export const flowMessages = {
  howSystemWorksMsg() {
    return `
      Así es como funciona este sistema:

      Puedes interactuar conmigo escribiendo una de las siguientes opciones:

      1️⃣ Información general del restaurante
      Horarios, ubicación, menú, disponibilidad y preguntas generales.

      2️⃣ Hacer una reserva
      Te pediré paso a paso la información necesaria:
      fecha, hora y número de personas.

      3️⃣ Modificar una reserva existente
      Puedes cambiar la información de tu reserva o cancelarla.

      4️⃣ ¿Cómo funciona este sistema?
      Puedo volver a explicarte estas reglas cuando lo necesites.

      ✍️ Escribe 1, 2, 3 o 4 para continuar.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim();
  },

  getExitMsg() {
    return `
      Gracias por usar nuestro servicio 😊
      Recuerda que puedes elegir una de estas opciones en cualquier momento:

      1️⃣ Información general del restaurante
      2️⃣ Hacer una reserva
      3️⃣ Modificar o cancelar una reserva existente
      4️⃣ ¿Cómo funciona este sistema?

      ✍️ Escribe 1, 2, 3 o 4 para continuar.
      💬 Si tienes otra pregunta, escríbela directamente.
    `;
  },

  getWelcomeMsg({ restaurantName }: WelcomeMessageParams): string {
    const GREETINGS = [
      `
          👋 ¡Hola! Soy ${AGENT_NAME}, el asistente de ${restaurantName}.

          Estoy aquí para ayudarte con información y reservas de forma rápida y sencilla.

          Para continuar, por favor elige UNA de las siguientes opciones escribiendo el número correspondiente:

          1️⃣ Información general del restaurante
          Horarios, ubicación, menú, disponibilidad y preguntas generales.

          2️⃣ Hacer una reserva
          Reservar una mesa indicando fecha, hora y número de personas.

          3️⃣ Modificar o cancelar una reserva
          Ver el estado de tu reserva, cambiarla o cancelarla.

          4️⃣ ¿Cómo funciona este sistema?
          Te explico paso a paso cómo interactuar conmigo y cómo hacer una reserva.

          ✍️ Escribe 1, 2, 3 o 4 para continuar.
          💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),
      `
      👋 ¡Hola! Soy ${AGENT_NAME}, el asistente de ${restaurantName}.

      Puedo ayudarte con información del restaurante y con reservas.

      Para comenzar, elige una opción escribiendo solo el número:

      1️⃣ Información general del restaurante
      2️⃣ Hacer una reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ ¿Cómo funciona este sistema?

      ✍️ Escribe 1, 2, 3 o 4 para continuar.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      ¡Hola! 😊 Te habla ${AGENT_NAME}, asistente de ${restaurantName}.

      Estoy aquí para ayudarte de forma rápida y clara.

      Selecciona una de las siguientes opciones escribiendo el número correspondiente:

      1️⃣ Información general (horarios, menú, ubicación)
      2️⃣ Reservar una mesa
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Explicación de cómo funciona el sistema

      ✍️ Escribe 1, 2, 3 o 4 para continuar.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      👋 Bienvenido/a. Soy ${AGENT_NAME}, asistente de ${restaurantName}.

      Puedo ayudarte con información o con reservas.

      Por favor, elige una opción:

      1️⃣ Información general del restaurante
      2️⃣ Crear una nueva reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Ayuda sobre cómo usar este sistema

      ✍️ Responde con 1, 2, 3 o 4.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      Hola 👋 Soy ${AGENT_NAME}, asistente de ${restaurantName}.

      Para ayudarte mejor, indícame qué deseas hacer:

      1️⃣ Consultar información del restaurante
      2️⃣ Hacer una reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Saber cómo funciona este sistema

      ✍️ Escribe el número de la opción que prefieras.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      ¡Hola! Te saluda ${AGENT_NAME} desde ${restaurantName} 😊

      Estoy aquí para ayudarte. Elige una de estas opciones:

      1️⃣ Información general
      2️⃣ Reservar una mesa
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Explicación del funcionamiento del sistema

      ✍️ Responde con 1, 2, 3 o 4.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      👋 Hola, soy ${AGENT_NAME}, asistente de ${restaurantName}.

      Puedes interactuar conmigo eligiendo una de estas opciones:

      1️⃣ Información sobre el restaurante
      2️⃣ Iniciar una reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Conocer cómo funciona este sistema

      ✍️ Escribe el número correspondiente para continuar.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      Bienvenido/a 👋 Soy ${AGENT_NAME}, asistente de ${restaurantName}.

      Para continuar, selecciona una opción:

      1️⃣ Información general del restaurante
      2️⃣ Hacer una reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Ayuda sobre el uso del sistema

      ✍️ Responde con 1, 2, 3 o 4.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      Hola 😊 Te atiende ${AGENT_NAME}, asistente de ${restaurantName}.

      Indica qué deseas hacer escribiendo una de estas opciones:

      1️⃣ Información del restaurante
      2️⃣ Reservar una mesa
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Saber cómo funciona el sistema

      ✍️ Escribe solo el número.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      👋 Hola. Soy ${AGENT_NAME}, el asistente de ${restaurantName}.

      Estoy aquí para ayudarte. Elige una opción para comenzar:

      1️⃣ Información general
      2️⃣ Nueva reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Explicación del sistema

      ✍️ Responde con 1, 2, 3 o 4.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      ¡Hola! 😊 Soy ${AGENT_NAME}, asistente de ${restaurantName}.

      Puedes elegir una de las siguientes opciones:

      1️⃣ Información del restaurante
      2️⃣ Hacer una reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Cómo funciona este sistema

      ✍️ Escribe el número de tu elección.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      Hola 👋 Te saluda ${AGENT_NAME} desde ${restaurantName}.

      Para continuar, selecciona una opción:

      1️⃣ Información general
      2️⃣ Reservar una mesa
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Ayuda sobre el funcionamiento del sistema

      ✍️ Responde con 1, 2, 3 o 4.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      👋 Bienvenido/a. Soy ${AGENT_NAME}, asistente de ${restaurantName}.

      Elige una de las siguientes opciones para comenzar:

      1️⃣ Información del restaurante
      2️⃣ Crear una reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Saber cómo funciona este sistema

      ✍️ Escribe el número correspondiente.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      Hola 😊 Soy ${AGENT_NAME}, asistente de ${restaurantName}.

      Indica qué deseas hacer:

      1️⃣ Información general del restaurante
      2️⃣ Hacer una reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Explicación del sistema

      ✍️ Responde con 1, 2, 3 o 4.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      👋 Hola. Te atiende ${AGENT_NAME}, asistente de ${restaurantName}.

      Para ayudarte mejor, selecciona una opción:

      1️⃣ Información general
      2️⃣ Reservar una mesa
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Cómo funciona este sistema

      ✍️ Escribe el número para continuar.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),

      `
      ¡Hola! 😊 Soy ${AGENT_NAME}, el asistente de ${restaurantName}.

      Estoy listo para ayudarte. Elige una opción:

      1️⃣ Información del restaurante
      2️⃣ Hacer una reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ Ayuda sobre el sistema

      ✍️ Responde con 1, 2, 3 o 4.
      💬 Si tienes otra pregunta o duda, escríbela directamente.
      `.trim(),
    ];
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  },
};

type ReservationMode = "create" | "update";

const MODE_COPY = {
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

export const reservationMessages = {
  enterReservationId(mode: ReservationMode = "update") {
    const copy = MODE_COPY[mode];
    return `
      Por favor, envíame **UN SOLO MENSAJE** con el **ID de la reserva** que deseas ${copy.verbInfinitive}.
    `.trim();
  },

  getStartMsg({
    userName,
    mode = "create",
  }: {
    userName?: string;
    mode?: ReservationMode;
  }) {
    const copy = MODE_COPY[mode];

    if (userName) {
      return `
        Perfecto ✅
        ${userName}, has elegido la opción: **${copy.action}**.

        Por favor, envíame **UN SOLO MENSAJE** con la siguiente información, **cada dato en una línea**, en este orden:

        1️⃣ **Fecha** de la reserva (formato: YYYY-MM-DD)
        2️⃣ **Hora** de la reserva (formato: HH:mm)
        3️⃣ **Número de personas**

        📌 Ejemplo:
        2025-12-21
        19:30
        2

        ⚠️ Importante:
        - Respeta el orden y el formato.
        - Si algún dato no es válido, te pediré que lo corrijas.

        Cuando envíes los datos, continuaré con la ${copy.process} de la reserva.
      `.trim();
    }

    return `
      Perfecto ✅
      Has elegido la opción: **${copy.action}**.

      Por favor, envíame **UN SOLO MENSAJE** con la siguiente información, **cada dato en una línea**, en este orden:

      1️⃣ Tu **nombre**
      2️⃣ **Fecha** de la reserva (formato: YYYY-MM-DD)
      3️⃣ **Hora** de la reserva (formato: HH:mm)
      4️⃣ **Número de personas**

      📌 Ejemplo:
      Juan Pérez
      2025-12-21
      19:30
      2

      ⚠️ Importante:
      - Respeta el orden y el formato.
      - Si algún dato no es válido, te pediré que lo corrijas.

      Cuando envíes los datos, continuaré con la ${copy.process} de la reserva.
    `.trim();
  },

  getReStartMsg({
    userName,
    mode = "create",
  }: {
    userName?: string;
    mode?: ReservationMode;
  }) {
    const copy = MODE_COPY[mode];

    if (userName) {
      return `
        ${userName}, por favor envíame nuevamente **UN SOLO MENSAJE** con la siguiente información, **cada dato en una línea**, en este orden:

        1️⃣ **Fecha** de la reserva (formato: YYYY-MM-DD)
        2️⃣ **Hora** de la reserva (formato: HH:mm)
        3️⃣ **Número de personas**

        📌 Ejemplo:
        2025-12-21
        19:30
        2

        ⚠️ Importante:
        - Respeta el orden y el formato.

        Continuaremos con la ${copy.process} de la reserva.
      `.trim();
    }

    return `
      Por favor, envíame nuevamente **UN SOLO MENSAJE** con la siguiente información, **cada dato en una línea**, en este orden:

      1️⃣ Tu **nombre**
      2️⃣ **Fecha** de la reserva (formato: YYYY-MM-DD)
      3️⃣ **Hora** de la reserva (formato: HH:mm)
      4️⃣ **Número de personas**

      📌 Ejemplo:
      Juan Pérez
      2025-12-21
      19:30
      2

      ⚠️ Importante:
      - Respeta el orden y el formato.

      Continuaremos con la ${copy.process} de la reserva.
    `.trim();
  },

  getConfirmationMsg(data: ReservationInput, mode: ReservationMode = "create") {
    const copy = MODE_COPY[mode];

    return `
      Por favor revisa los datos antes de confirmar la ${copy.process} de tu reserva:

      👤 Nombre: ${data?.name}
      📅 Fecha: ${data.day}
      ⏰ Hora: ${data.startTime}
      👥 Número de personas: ${data.numberOfPeople}

      Si los datos son correctos, escribe:
      ✅ ${CustomerActions.CONFIRM}

      Si deseas corregirlos, escribe:
      ✏️ ${CustomerActions.RESTART}

      Si no deseas continuar, escribe:
      🚪 ${CustomerActions.EXIT}
    `.trim();
  },

  getSuccessMsg(
    appointment: Appointment,
    {
      restaurantName,
      customerName,
      numberOfPeople,
      mode = "create",
    }: {
      restaurantName: string;
      customerName: string;
      numberOfPeople: number;
      mode?: ReservationMode;
    },
  ): string {
    const copy = MODE_COPY[mode];

    return `
      ✅ Tu reserva ha sido ${copy.verb} con éxito.

      📍 Restaurante: ${restaurantName}
      👤 Nombre: ${customerName}
      📅 Fecha: ${appointment.day}
      ⏰ Hora: ${appointment.startDateTime}
      👥 Personas: ${numberOfPeople}

      🆔 ID de reserva: ${appointment.id}

      ⚠️ Guarda este ID.
      Lo necesitarás para futuras modificaciones o consultas técnicas.

      Para continuar, puedes escribir:
      1️⃣ Información del restaurante
      2️⃣ Hacer otra reserva
      3️⃣ Modificar o cancelar una reserva
      4️⃣ ¿Cómo funciona el sistema?
    `.trim();
  },
};
