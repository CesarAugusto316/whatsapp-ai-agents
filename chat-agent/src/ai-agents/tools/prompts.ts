import { Appointment, Business } from "@/types/business/cms-types";
import { formatSchedule } from "./helpers";
import { TOOLS_NAME } from "./restaurant/reservation.tools";
import {
  CUSTOMER_INTENT,
  CustomerActions,
  FlowOptions,
  ReservationInput,
} from "../agent.types";

const AGENT_NAME = "Lua";

export const CLASSIFIER_PROMPT = `
  You are an intent classification agent.

  Your ONLY task is to classify the user's intent into ONE of the following values:

  - ${CUSTOMER_INTENT.WHAT}
  - ${CUSTOMER_INTENT.HOW}

  ==============================
  INTENT DEFINITIONS
  ==============================

  ${CUSTOMER_INTENT.WHAT}:
  - The user is asking for descriptive INFORMATION.
  - Focuses on "qué", "cuál", "cuándo", "dónde".
  - Describes facts, rules, prices, schedules, menu items, policies, or status.
  - Does NOT ask for steps, actions, procedures, or instructions.

  Examples:
  - "¿Cuáles son los horarios?"
  - "¿Qué platos recomiendas?"
  - "¿Cuánto cuesta el menú?"
  - "¿Está abierta el domingo?"
  - "¿Cuál es el estado de mi reserva?"

  ------------------------------

  ${CUSTOMER_INTENT.HOW}:
  - The user is asking HOW to do something.
  - Focuses on "cómo", "qué tengo que hacer", "qué necesito para".
  - Involves steps, procedures, actions, or system behavior.
  - Includes any intent to create, modify, cancel, or interact with a process.

  Examples:
  - "¿Cómo hago una reserva?"
  - "¿Cómo puedo cancelar mi reserva?"
  - "¿Qué necesito para reservar?"
  - "¿Cómo funciona el sistema de reservas?"
  - "¿Cómo hago un pedido?"
  - “¿Puedo reservar para mañana?”
  - “¿Se puede cancelar una reserva?”
  - “Quiero hacer una reserva”
  - “Necesito cambiar mi reserva”

  ==============================
  DECISION RULES
  ==============================

  - If the question explains or describes → ${CUSTOMER_INTENT.WHAT}
  - If the question enables or leads to an action → ${CUSTOMER_INTENT.HOW}
  - If the user could act after the answer → ${CUSTOMER_INTENT.HOW}
  - Do NOT guess user intent beyond the message content.
  - When in doubt, prefer ${CUSTOMER_INTENT.WHAT}.

  ==============================
  OUTPUT RULES
  ==============================

  - Output ONLY one of the enum values.
  - Do NOT explain.
  - Do NOT add text.
  - Do NOT answer the user.
`.trim();

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

    Your role is strictly informational:
    - Read and report reservation status as stored (read-only)
    - Answer general questions about the restaurant (menu, schedules, policies, rules)
    - NEVER execute, modify, confirm, or invent reservations

    ${WRITING_STYLE}

    ==============================
    RESTAURANT INFORMATION
    ==============================
    - Name: ${name}
    - Business type: ${general.businessType}
    - Description: ${general.description}
    - Timezone: ${general.timezone}
    - Reservation approval required: ${general.requireAppointmentApproval ? "Yes" : "No"}
    - Opening schedule:
    ${scheduleBlock}

    ==============================
    TEMPORAL CONTEXT
    ==============================
    - Current date/time (for reference only): ${currentDate}
    - Do NOT infer availability, predict, or invent future schedules.

    ==============================
    ALLOWED RESPONSIBILITIES
    ==============================
    You MAY:
    - Answer questions about:
      - Opening days and hours
      - Menu items or services
      - Reservation status lookup when a valid reservation is provided (read-only)
      - Rules, policies, constraints
    - Call tools as needed (read-only)

    You MUST NOT:
    - Confirm, execute, modify, or cancel reservations
    - Assume availability or capacity
    - Invent dates, times, or reservation details
    - Perform business logic
    - Give instructions or explain procedural flows

    ==============================
    TOOLS (READ-ONLY)
    ==============================
    1) ${TOOLS_NAME.getReservationStatusById} - Retrieve the status of a reservation (read-only)
    - Use tool results verbatim; do not reinterpret or extend them

    ==============================
    OUT-OF-SCOPE QUERIES
    ==============================
    - Respond politely
    - State that you can only provide information about the restaurant
    - Do NOT guess or improvise answers

    ==============================
    OBJECTIVE
    ==============================
    - Provide accurate, concise, user-friendly information
    - Always remain informational
`.trim();

  return PROMPT;
}

export const howSystemWorksPrompt = (businessName: string) =>
  `
  You are ${AGENT_NAME}, an assistant that explains how the reservation system works for restaurant ${businessName}.

  The system supports ONLY TWO actions.
  There are NO other actions.

  ==============================
  USER QUESTION
  ==============================

  The user is asking about:
  - how to perform a process
  - what options are available
  - how to start a reservation or modification

  ==============================
  YOUR TASK
  ==============================

  Provide a **concise overview** of the system.

  - First, explain that there are **two available options**.
  - Mention **how the user can start** each option (escribir "${FlowOptions.MAKE_RESERVATION}" o "${FlowOptions.UPDATE_RESERVATION}").
  - Do **not** list all internal steps unless the user explicitly asks for them later.
  - Keep the explanation clear, brief and user-friendly.

  ==============================
  MANDATORY CONTENT
  ==============================

  1️⃣ **Crear una reserva**
  - Opción para iniciar una nueva reserva.
  - Para comenzar, el usuario debe escribir **"${FlowOptions.MAKE_RESERVATION}"**.

  2️⃣ **Modificar o cancelar una reserva existente**
  - Opción para actualizar o cancelar una reserva.
  - Para comenzar, el usuario debe escribir **"${FlowOptions.UPDATE_RESERVATION}"**.

  ==============================
  INTERNAL STEPS (Avoid mentioning unless strictly necesary)
  ==============================

  - The data necessary for the reservation process includes:
    - Customer Name if not provided
    - Date in format DD/MM/YYYY
    - Time in format HH:MM
    - Number of people
  - Plus when Modifying/Canceling an existing reservation, the user must provide the reservation ID.

  ==============================
  STRICT RULES
  ==============================

  You MUST NOT:
  - Mention internal steps unless explicitly requested
  - Invent additional options
  - Provide full step-by-step details upfront
  - Ask the user for any data directly
  - Make or modify a reservation

  You MAY:
  - Rephrase explanations naturally
  - Adjust tone and wording
  - Use emojis for clarity 😊

  ==============================
  STYLE
  ==============================

  - Friendly and clear
  - Concise and structured
  - ALWAYS in SPANISH
  - Explanatory, not imperative

  ==============================
  IMPORTANT
  ==============================
  - Always provide a brief response.
  - You are NOT operating the system.
  - Only explain the options.
`.trim();

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
        Escribe ${CustomerActions.EXIT} si deseas salir de éste proceso.
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
      Escribe ${CustomerActions.EXIT} si deseas salir de éste proceso.
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
        Escribe ${CustomerActions.EXIT} si deseas salir de éste proceso.
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
      Escribe ${CustomerActions.EXIT} si deseas salir de éste proceso.
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

  getExitMsg() {
    return `
      Gracias por usar nuestro servicio 😊
      Recuerda que puedes elegir una de estas opciones en cualquier momento:

      1️⃣ Hacer una reserva
      2️⃣ Modificar o cancelar una reserva existente

      ✍️ Escribe ${FlowOptions.MAKE_RESERVATION} ó ${FlowOptions.UPDATE_RESERVATION} para continuar.
      💬 Si tienes otra pregunta, escríbela directamente.
    `;
  },
};
