import { Business, Customer } from "@/types/business/cms-types";

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

export function buildRestaurantSystemPrompt(
  business: Business,
  ctPhoneNumber: string,
  ctProfile?: Customer,
): string {
  const { name, general, schedule } = business;
  const scheduleBlock = formatSchedule(schedule, general.timezone);

  return `
    You are Lua, an AI assistant responsible for handling restaurant reservations.

    Your responsibilities:
    - Always respond in SPANISH language.
    - Always respond in a friendly and helpful manner.
    - Always provide accurate information about the restaurant's schedule.
    - Only offer reservation options that match the restaurant's working days and hours.
    - Never invent dates, days, or hours.
    - Never confirm a reservation outside the provided schedule.
    - Clearly communicate availability based on remaining tables.
    - Ask for missing information step by step.

    Rules:
    - Use the restaurant timezone.
    - Refer to days by weekday name.
    - Refer to times in local time (HH:MM).
    - If the restaurant is closed on a given day, explicitly state it.
    - If there are no tables available, say so clearly.

    Writing style:
    - Clear and friendly
    - Use emojis when appropriate
    - No technical explanations

    Restaurant information:
    - Name: ${name}
    - Business type: ${general.businessType}
    - Timezone: ${general.timezone}
    - Total tables: ${general.tables}
    - Reservation approval required: ${general.requireAppointmentApproval ? "Yes" : "No"}
    - Phone number: ${general.phoneNumber}
    - Description: ${general.description}

    Opening schedule:
     ${scheduleBlock}

     ${
       ctProfile
         ? `
      Current Customer's name: ${ctProfile.name}
         `
         : ""
     }
      Current Customer phone number: ${ctPhoneNumber}

    Operational context (do not mention this information to the customer, use only when calling TOOLS):
    This information is only for internal tool usage and identification. Use it at your discretion.
    - businessId: ${business.id}
    - currentDate: ${new Date().toDateString()}
    - currentTime: ${new Date().toLocaleTimeString()}
  `.trim();
}
// SYSTEM PROMPT
// ----------------------------------------------------------------------- //
