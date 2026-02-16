import { formatSchedule, getGoogleMapLink } from "@/domain/utilities";
import type { InformationalIntentKey } from "@/application/services/pomdp";
import type { RestaurantCtx } from "@/domain/restaurant";
import { basePrompt } from "./base-prompt";

/**
 * Helper para renderizado condicional de información.
 * Si el valor es null, undefined, string vacío o "N/A", retorna string vacío.
 */
const renderField = (value: unknown, label: string): string => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "N/A"
  ) {
    return "";
  }
  return `- ${label}: ${value}\n`;
};

/**
 * Helper para bloques condicionales completos.
 * Si todos los campos están vacíos, retorna string vacío.
 */
const renderConditionalBlock = (lines: string[], title?: string): string => {
  const filtered = lines.filter((line) => line.trim() !== "");
  if (filtered.length === 0) return "";

  if (title) {
    return `\n${title}\n${filtered.join("")}`;
  }
  return filtered.join("");
};

export function businessInfoChunck(
  intentKey: InformationalIntentKey,
  ctx: RestaurantCtx,
): string {
  const { name, general, schedule, currency } = ctx.business;
  const SCHEDULE_BLOCK = formatSchedule(schedule, general.timezone);
  const currentDate = new Date().toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "full",
    timeZone: general.timezone,
  });

  // Base minimalista (siempre necesaria)
  const base = `
    ${basePrompt(ctx)}

    INTENT DETECTED:
    ${intentKey}

    GENERAL RULES:
    - No menciones el intento detectado.
    - NEVER invent information.
    - If requested information is not available in the context above, respond kindly: "Lo siento, no cuento con esa información en este momento. ¿Hay algo más en lo que pueda ayudarte?"
    - Only use information explicitly provided in the BUSINESS INFORMATION sections below.

    ==============================
    BUSINESS GENERAL INFORMATION
    ==============================
    - Name: ${name}
    - Business type: ${general.businessType || "Not specified"}
    - Description: ${general.description || "Not available"}
    - Timezone: ${general.timezone}
    ${renderField(general.requireAppointmentApproval ? "Yes" : "No", "Appointment approval required")}
    ${renderField(schedule.minDurationTime, "Minimum booking duration (minutes)")}
`.trim();

  // Mapeo 1:1 intentKey → sección relevante con renderizado condicional
  const sections: Record<InformationalIntentKey, string> = {
    "info:ask_location":
      renderConditionalBlock(
        [
          renderField(general.address, "Address"),
          general.location
            ? `- Google Maps: ${getGoogleMapLink(general.location[0], general.location[1])}\n`
            : "",
        ],
        "\nBUSINESS LOCATION",
      ) +
      `\n\nSPECIFIC RULE:\n- Share both address and Google Maps link if available.`,

    "info:ask_business_hours": `
        BUSINESS SCHEDULE
        ${SCHEDULE_BLOCK}

        CURRENT TIME (reference only):
        ${currentDate}

        ⚠️ RULE: Do NOT infer future availability — only state published hours.`,

    "info:ask_payment_methods": `
        PAYMENT METHODS ACCEPTED
        - Cash (${currency || "Local currency"})
        - Debit Card
        - Credit Card`,

    "info:ask_contact":
      renderConditionalBlock(
        [
          renderField(general?.user?.email, "Email"),
          renderField(general?.user?.phoneNumber, "Phone"),
        ],
        "\nCONTACT INFORMATION",
      ) +
      `\n\nRULE: If contact fields are empty, say: "No tengo disponible ese dato de contacto en este momento."`,

    "info:ask_price": `
        PRICING POLICY
        - Prices vary by product/item selected
        - No fixed pricing — depends on order composition`,

    "info:ask_delivery_time": `
        DELIVERY TIMING
        - Processing time depends on:
          • Selected product/item
          • Current kitchen demand
        - No fixed ETA — provided at order confirmation`,

    "info:ask_delivery_method": `
        DELIVERY OPTIONS
        - 🚶 Pick up: Available at establishment
        - 🛵 Delivery: Home delivery available
        - Method selected during order placement
  `,
  };

  const fallback = `
      AVAILABLE INFORMATION CATEGORIES:
      - Location & Address
      - Business Hours
      - Contact Information
      - Payment Methods
      - Delivery Options & Timing
      - Pricing Policy

      Please ask specifically about what you need. I'll share the available information.
  `;

  // Fallback: información general mínima si no hay match
  const relevantSection = sections[intentKey] || fallback;

  return `${base}\n\n${relevantSection.trim()}`;
}
