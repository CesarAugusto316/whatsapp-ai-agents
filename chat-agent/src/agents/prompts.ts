import { z } from "zod";

export const AGENT_NAME = "Lua";

export enum CUSTOMER_INTENT {
  INFO_RESERVATION = "INFO_RESERVATION",
  MAKE_RESERVATION = "MAKE_RESERVATION",
  UPDATE_RESERVATION = "UPDATE_RESERVATION",
  HOW_SYSTEM_WORKS = "HOW_SYSTEM_WORKS",
  UNKNOWN = "UNKNOWN",
}

export const customerIntentSchema = z.enum([
  CUSTOMER_INTENT.INFO_RESERVATION,
  CUSTOMER_INTENT.MAKE_RESERVATION,
  CUSTOMER_INTENT.UPDATE_RESERVATION,
  CUSTOMER_INTENT.HOW_SYSTEM_WORKS,
  CUSTOMER_INTENT.UNKNOWN,
]);

export const CLASSIFIER_PROMPT = `
  Domain context:
    - This classifier operates ONLY within the context of a restaurant reservation system.
    - Assume the user is interacting with a restaurant via chat.
    - All intents MUST be interpreted relative to restaurant information, reservations, or system usage.

  You are NOT a conversational agent. You are a deterministic intent classifier.

  Your task is to output EXACTLY ONE of the following strings,
  with no extra characters, no punctuation, no quotes, no explanations:

  ${CUSTOMER_INTENT.INFO_RESERVATION}
  ${CUSTOMER_INTENT.MAKE_RESERVATION}
  ${CUSTOMER_INTENT.UPDATE_RESERVATION}
  ${CUSTOMER_INTENT.HOW_SYSTEM_WORKS}
  ${CUSTOMER_INTENT.UNKNOWN}

  Intent definitions:

  ${CUSTOMER_INTENT.INFO_RESERVATION}
  - General questions about the restaurant: schedules, availability, policies, menu, or how reservations work
  - Always related to a restaurant context
    Examples: "what time do you open?", "do you have tables today?", "can I make a reservation tomorrow at 4pm?"

  ${CUSTOMER_INTENT.MAKE_RESERVATION}
  - Explicit intent to create a new reservation
  - Includes date, time, people, or phrases like "I want to reserve"
    Examples: "I want to reserve a table", "table for two tomorrow", "reserve for tonight"

  ${CUSTOMER_INTENT.UPDATE_RESERVATION}
  - User indicates they already made a reservation
  - Wants to check, confirm, or see its status
    Examples: "I already booked", "check my reservation", "reservation status", "I want to change my reservation", "I want to cancel my reservation"

  ${CUSTOMER_INTENT.HOW_SYSTEM_WORKS}
  - Questions about how to use this chat system
  - User is asking for instructions, rules, or available options
  - Not about the restaurant itself, but about interaction with the system
    Examples:
    "how does this work?"
    "how can I order?"
    "what can I do here?"
    "can you help me?"
    "explain me again how to use this"
    "how do I make a reservation here?"
    "I forgot how to use this"
    "how do I cancel a reservation?"
    "how do I change a reservation?"

  ${CUSTOMER_INTENT.UNKNOWN}
  - Ambiguous, unrelated, or unclear messages

  Rules:
  - Output ONLY one of the allowed strings above.
  - Do NOT include whitespace, punctuation, or newlines.
  - Do NOT explain your reasoning.
  - Do NOT combine intents.
  - If the message includes a greeting AND a request, classify by the REQUEST.
  - If uncertain, output ${CUSTOMER_INTENT.UNKNOWN}.
  - If the user asks about procedures, steps, or rules of interaction, prefer ${CUSTOMER_INTENT.HOW_SYSTEM_WORKS} over other intents.
`.trim();

export enum FlowChoices {
  GENERAL_INFO = "1",
  MAKE_RESERVATION = "2",
  UPDATE_RESERVATION = "3",
  HOW_SYSTEM_WORKS = "4",
}

type WelcomeMessageParams = {
  assistantName: string;
  restaurantName: string;
  userName?: string;
};

export const buildWelcomeMessage = ({
  assistantName,
  restaurantName,
}: WelcomeMessageParams): string => {
  const GREETINGS = [
    `
        👋 ¡Hola! Soy ${assistantName}, el asistente de ${restaurantName}.

        Estoy aquí para ayudarte con información y reservas de forma rápida y sencilla.

        Para continuar, por favor elige UNA de las siguientes opciones escribiendo el número correspondiente:

        1️⃣ Información general del restaurante
        Horarios, ubicación, menú, disponibilidad y preguntas generales.

        2️⃣ Hacer una reserva
        Reservar una mesa indicando fecha, hora y número de personas.

        3️⃣ Consultar o modificar una reserva existente
        Ver el estado de tu reserva, cambiarla o cancelarla.

        4️⃣ ¿Cómo funciona este sistema?
        Te explico paso a paso cómo interactuar conmigo y cómo hacer una reserva.

        ✍️ Escribe 1, 2, 3 o 4 para continuar.
        💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),
    `
    👋 ¡Hola! Soy ${assistantName}, el asistente de ${restaurantName}.

    Puedo ayudarte con información del restaurante y con reservas.

    Para comenzar, elige una opción escribiendo solo el número:

    1️⃣ Información general del restaurante
    2️⃣ Hacer una reserva
    3️⃣ Consultar o modificar una reserva existente
    4️⃣ ¿Cómo funciona este sistema?

    ✍️ Escribe 1, 2, 3 o 4 para continuar.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    ¡Hola! 😊 Te habla ${assistantName}, asistente de ${restaurantName}.

    Estoy aquí para ayudarte de forma rápida y clara.

    Selecciona una de las siguientes opciones escribiendo el número correspondiente:

    1️⃣ Información general (horarios, menú, ubicación)
    2️⃣ Reservar una mesa
    3️⃣ Ver, modificar o cancelar una reserva
    4️⃣ Explicación de cómo funciona el sistema

    ✍️ Escribe 1, 2, 3 o 4 para continuar.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    👋 Bienvenido/a. Soy ${assistantName}, asistente de ${restaurantName}.

    Puedo ayudarte con información o con reservas.

    Por favor, elige una opción:

    1️⃣ Información general del restaurante
    2️⃣ Crear una nueva reserva
    3️⃣ Consultar o cambiar una reserva existente
    4️⃣ Ayuda sobre cómo usar este sistema

    ✍️ Responde con 1, 2, 3 o 4.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    Hola 👋 Soy ${assistantName}, asistente de ${restaurantName}.

    Para ayudarte mejor, indícame qué deseas hacer:

    1️⃣ Consultar información del restaurante
    2️⃣ Hacer una reserva
    3️⃣ Revisar o modificar una reserva
    4️⃣ Saber cómo funciona este sistema

    ✍️ Escribe el número de la opción que prefieras.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    ¡Hola! Te saluda ${assistantName} desde ${restaurantName} 😊

    Estoy aquí para ayudarte. Elige una de estas opciones:

    1️⃣ Información general
    2️⃣ Reservar una mesa
    3️⃣ Consultar, modificar o cancelar una reserva
    4️⃣ Explicación del funcionamiento del sistema

    ✍️ Responde con 1, 2, 3 o 4.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    👋 Hola, soy ${assistantName}, asistente de ${restaurantName}.

    Puedes interactuar conmigo eligiendo una de estas opciones:

    1️⃣ Información sobre el restaurante
    2️⃣ Iniciar una reserva
    3️⃣ Consultar o cambiar una reserva existente
    4️⃣ Conocer cómo funciona este sistema

    ✍️ Escribe el número correspondiente para continuar.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    Bienvenido/a 👋 Soy ${assistantName}, asistente de ${restaurantName}.

    Para continuar, selecciona una opción:

    1️⃣ Información general del restaurante
    2️⃣ Hacer una reserva
    3️⃣ Ver o modificar una reserva
    4️⃣ Ayuda sobre el uso del sistema

    ✍️ Responde con 1, 2, 3 o 4.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    Hola 😊 Te atiende ${assistantName}, asistente de ${restaurantName}.

    Indica qué deseas hacer escribiendo una de estas opciones:

    1️⃣ Información del restaurante
    2️⃣ Reservar una mesa
    3️⃣ Consultar o modificar una reserva
    4️⃣ Saber cómo funciona el sistema

    ✍️ Escribe solo el número.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    👋 Hola. Soy ${assistantName}, el asistente de ${restaurantName}.

    Estoy aquí para ayudarte. Elige una opción para comenzar:

    1️⃣ Información general
    2️⃣ Nueva reserva
    3️⃣ Consultar o cambiar una reserva
    4️⃣ Explicación del sistema

    ✍️ Responde con 1, 2, 3 o 4.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    ¡Hola! 😊 Soy ${assistantName}, asistente de ${restaurantName}.

    Puedes elegir una de las siguientes opciones:

    1️⃣ Información del restaurante
    2️⃣ Hacer una reserva
    3️⃣ Revisar o modificar una reserva existente
    4️⃣ Cómo funciona este sistema

    ✍️ Escribe el número de tu elección.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    Hola 👋 Te saluda ${assistantName} desde ${restaurantName}.

    Para continuar, selecciona una opción:

    1️⃣ Información general
    2️⃣ Reservar una mesa
    3️⃣ Consultar o modificar una reserva
    4️⃣ Ayuda sobre el funcionamiento del sistema

    ✍️ Responde con 1, 2, 3 o 4.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    👋 Bienvenido/a. Soy ${assistantName}, asistente de ${restaurantName}.

    Elige una de las siguientes opciones para comenzar:

    1️⃣ Información del restaurante
    2️⃣ Crear una reserva
    3️⃣ Consultar o cambiar una reserva
    4️⃣ Saber cómo funciona este sistema

    ✍️ Escribe el número correspondiente.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    Hola 😊 Soy ${assistantName}, asistente de ${restaurantName}.

    Indica qué deseas hacer:

    1️⃣ Información general del restaurante
    2️⃣ Hacer una reserva
    3️⃣ Consultar o modificar una reserva existente
    4️⃣ Explicación del sistema

    ✍️ Responde con 1, 2, 3 o 4.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    👋 Hola. Te atiende ${assistantName}, asistente de ${restaurantName}.

    Para ayudarte mejor, selecciona una opción:

    1️⃣ Información general
    2️⃣ Reservar una mesa
    3️⃣ Consultar, modificar o cancelar una reserva
    4️⃣ Cómo funciona este sistema

    ✍️ Escribe el número para continuar.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),

    `
    ¡Hola! 😊 Soy ${assistantName}, el asistente de ${restaurantName}.

    Estoy listo para ayudarte. Elige una opción:

    1️⃣ Información del restaurante
    2️⃣ Hacer una reserva
    3️⃣ Consultar o modificar una reserva
    4️⃣ Ayuda sobre el sistema

    ✍️ Responde con 1, 2, 3 o 4.
    💬 Si tienes otra pregunta o duda, escríbela directamente.
    `.trim(),
  ];

  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
};

export const HOW_SYSTEM_WORKS = `
  Así es como funciona este sistema:

  Puedes interactuar conmigo escribiendo una de las siguientes opciones:

  1️⃣ Información general del restaurante
  Horarios, ubicación, menú, disponibilidad y preguntas generales.

  2️⃣ Hacer una reserva
  Te pediré paso a paso la información necesaria:
  fecha, hora y número de personas.

  3️⃣ Consultar o modificar una reserva existente
  Puedes revisar el estado de tu reserva, cambiarla o cancelarla.

  4️⃣ ¿Cómo funciona este sistema?
  Puedo volver a explicarte estas reglas cuando lo necesites.

  ✍️ Escribe 1, 2, 3 o 4 para continuar.
  💬 Si tienes otra pregunta o duda, escríbela directamente.
`.trim();

export function reservationStartMessage({ userName }: { userName?: string }) {
  return `
    Perfecto ✅
    Has elegido la **opción 2: Hacer una reserva**.

    Por favor, envíame **UN SOLO MENSAJE** con la siguiente información, **cada dato en una línea**, en este orden:

    1️⃣ Tu **nombre**
    2️⃣ **Fecha y hora** de la reserva (formato: YYYY-MM-DD HH:mm)
    3️⃣ **Número de personas**

    📌 Ejemplo:
    Juan Pérez
    2025-12-21 19:30
    2

    ⚠️ Importante:
    - Respeta el orden y el formato.
    - Si algún dato no es válido, te pediré que lo corrijas.

    Cuando envíes los datos, verificaré la disponibilidad.
`.trim();
}
