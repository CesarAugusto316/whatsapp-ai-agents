import { Business } from "@/types/business/cms-types";
import { GenerateTextResult, ToolSet } from "ai";

/**
 *
 * @description Parse input string to object
 * @param arg input schema from LLM that is passed to the ai-sdk for tool decision
 * @returns
 */
export const parseInput = (arg: string | Record<string, string>) => {
  if (typeof arg === "string") {
    try {
      // El modelo devuelve un string con comillas externas y JSON dentro.
      // Primero, quitamos las comillas exteriores.
      let str = arg.trim();
      if (str.startsWith('"') && str.endsWith('"')) {
        str = str.slice(1, -1);
      }
      // Parseamos el JSON interno
      return JSON.parse(str);
    } catch (error) {
      // Si falla, devolvemos el argumento original para que la validación falle
      console.error("Failed to parse input:", arg, error);
      return {};
    }
  }
  // Si no es string, lo devolvemos tal cual (debería ser objeto)
  return arg;
};

export const AVAILABLE = {
  YES: true,
  NO: false,
} as const;

export enum ROUTING {
  InfoReservation = "infoReservation",
  MakeReservation = "makeReservation",
  UpdateReservation = "updateReservation",
  CancelReservation = "cancelReservation",
}

export enum RESERVATION {
  CREATE_TRIGGER = "CONFIRMAR RESERVA",
  UPDATE_TRIGGER = "CAMBIAR RESERVA",
  DELETE_TRIGGER = "CANCELAR RESERVA",
  SUCCESS = "RESERVA CONFIRMADA",
  FAILURE = "RESERVA NO CONFIRMADA",
}

// ----------------------------------------------------------------------- //
// SYSTEM PROMPT

type WeekDay = Omit<Business["schedule"], "averageTime">;

export const WEEK_DAYS: Array<keyof WeekDay> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function renderAssistantText<T>(result: T): string {
  return (result as GenerateTextResult<ToolSet, unknown>).steps
    .flatMap((step) => step.content ?? [])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTime(isoString: string, timezone: string): string {
  const date = new Date(isoString);

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
}

function formatSchedule(schedule: WeekDay, timezone: string): string {
  return WEEK_DAYS.map((day) => {
    const slots = schedule[day];

    if (!slots || slots?.length === 0) {
      return `- ${capitalize(day)}: Closed`;
    }
    const ranges = slots
      .map((slot) => {
        const start = formatTime(slot.startTime, timezone);
        const end = formatTime(slot.endTime, timezone);
        return `${start} to ${end}`;
      })
      .join("\n  ");

    return `- ${capitalize(day)}:\n  ${ranges}`;
  }).join("\n");
}

const AGENT_NAME = "Lua";
const WRITING_STYLE = `
  Writing style:
  - Clear and friendly
  - Use emojis when appropriate, ex: 😊, 🤗, 🤗, ✌🏽, ✨, ✅, 🎉 etc.

  Your responsibilities:
  - Always respond in SPANISH language.
  - Always respond in a friendly and helpful manner.
  - Never invent dates, days, or hours.
  - ALWAYS Ask for missing information step by step.
  - Ask for confirmation and validation of customer information.
  - Refer to days by weekday name.
  - Refer to times in local time (HH:MM).
  - Consider always: currentDate: ${new Date().toDateString()} and currentTime: ${new Date().toLocaleTimeString()}
`;

export function buildCustomerServiceSystemPrompt(business: Business) {
  const { name, general, schedule } = business;
  const scheduleBlock = formatSchedule(schedule, general.timezone);
  return `
  You are ${AGENT_NAME}, an AI assistant responsible for handling customer service for restaurant ${name}.

  ${WRITING_STYLE}
    - Always provide accurate information about the restaurant's schedule and services/food as well as any special events or promotions.
    - Only offer reservation options that match the restaurant's working days and hours.
    - Never confirm a reservation outside the provided schedule.

  Rules:
  - Every user that interacts with you is a customer.
  - To confirm a reservation, the customer must explicitly write:
    ${RESERVATION.CREATE_TRIGGER}

  Restaurant information:
  - Name: ${name}
  - Business type: ${general.businessType}
  - Total tables: ${general.tables}
  - Reservation approval required: ${general.requireAppointmentApproval ? "Yes" : "No"}
  - Phone number: ${general.phoneNumber}
  - Timezone: ${general.timezone}
  - Description: ${general.description}

  Opening schedule:
   ${scheduleBlock}
  `.trim();
}

export function buildReservationSystemPrompt(business: Business): string {
  return `
    You are ${AGENT_NAME}, an AI assistant responsible for handling restaurant reservations for restaurant ${business.name}.
    ${WRITING_STYLE}

     Rules:
    - NEVER call the ${ROUTING.MakeReservation} tool unless the user has explicitly written
       the confirmation keyword ${RESERVATION.CREATE_TRIGGER}.
    - Every user that interacts with you is a customer.
    - Ask for the customer's name only if you don't know it when doing a reservation.
    - After a reservation is made, give the customer the day, time of the reservation and the reservationId,
      add the keyword ${RESERVATION.SUCCESS} ✅ to the end of the message.
    - If the reservation is not made, give the customer a reason why the reservation could not be made.
      add the keyword ${RESERVATION.FAILURE} ❌ to the end of the message.
  `.trim();
}

export const ROUTER_AGENT_PROMPT = `
  You are a routing classifier.

  Your task is to output EXACTLY ONE string from the allowed list.

  IMPORTANT RULES:
  - ${ROUTING.MakeReservation} MUST ONLY be selected if the user's message explicitly contains the confirmation keyword ${RESERVATION.CREATE_TRIGGER}.
  - ${ROUTING.UpdateReservation} MUST ONLY be selected if the user's message explicitly contains the keyword ${RESERVATION.UPDATE_TRIGGER}.
  - ${ROUTING.CancelReservation} MUST ONLY be selected if the user's message explicitly contains the keyword ${RESERVATION.DELETE_TRIGGER}.
  - If the message does not contain enough information for a reservation confirmation, output ${ROUTING.InfoReservation} instead of attempting ${ROUTING.MakeReservation}.
  - Always return exactly ONE of the allowed actionTypes with no extra punctuation, quotes, or whitespace.

  Allowed outputs:
  - ${ROUTING.InfoReservation}
  - ${ROUTING.MakeReservation}
  - ${ROUTING.UpdateReservation}
  - ${ROUTING.CancelReservation}

  Action selection rules:
  - ${ROUTING.InfoReservation}:
    Use when the user asks for information, or if more details are required before making a reservation confirmation.
  - ${ROUTING.MakeReservation}:
    Use ONLY if the message explicitly contains ${RESERVATION.CREATE_TRIGGER} AND all required reservation details (day, time) are provided.
  - ${ROUTING.UpdateReservation}:
    Use ONLY if the message explicitly contains ${RESERVATION.UPDATE_TRIGGER} AND the user wants to modify an existing reservation.
  - ${ROUTING.CancelReservation}:
    Use ONLY if the message explicitly contains ${RESERVATION.DELETE_TRIGGER} AND the user wants to cancel or delete an existing reservation.

  Priority rules:
  - Explicit cancellation > update > creation > information
  - Modification requests always imply an existing reservation

  Final instruction:
  - Return ONLY one allowed output string. No exceptions.
`.trim();

// SYSTEM PROMPT
// ----------------------------------------------------------------------- //
