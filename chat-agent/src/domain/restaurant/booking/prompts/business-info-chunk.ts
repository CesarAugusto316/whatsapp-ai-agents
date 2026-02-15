import { formatSchedule, getGoogleMapLink } from "@/domain/utilities";
import type { InformationalIntentKey } from "@/application/services/pomdp";
import type { RestaurantCtx } from "@/domain/restaurant";
import { basePrompt } from "./base-prompt";

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

    RULES:
    - No menciones el intento detectado.
    - You Never invent information,

    ==============================
    BUSINESS GENERAL INFORMATION
    ==============================
    - Name: ${name}
    - Business type: ${general.businessType}
    - General Description: ${general.description}
    - Timezone: ${general.timezone}

    - Booking:
      - Approval by owner/admin required: ${general.requireAppointmentApproval ? "Yes" : "No"}
      - Minimal booking duration: ${schedule.minDurationTime} minutes
  `.trim();

  // Mapeo 1:1 intentKey → sección relevante
  const sections: Record<InformationalIntentKey, string> = {
    "info:ask_location": `
        BUSINESS LOCATION
        - Address: ${general.address}
        - Google Maps: ${general.location ? getGoogleMapLink(general.location[0], general.location[1]) : "Not available"}
    `,
    "info:ask_business_hours": `
        BUSINESS SCHEDULE
        ${SCHEDULE_BLOCK}

        CURRENT TIME (reference only):
        ${currentDate}
        ⚠️ Do NOT infer future availability — only state published hours.
    `,
    "info:ask_payment_methods": `
        PAYMENT METHODS
        - Cash (${currency})
        - Debit Card
        - Credit Card
    `,
    "info:ask_contact": `
        CONTACT INFORMATION
        - Email: ${general?.user?.email}
        - Phone: ${general?.user?.phoneNumber}
  `,
    "info:ask_price": `
        PRICING POLICY
        - Prices vary by product/item selected
        - No fixed pricing — depends on order composition
  `,
    "info:ask_delivery_time": `
        DELIVERY TIMING
        - Processing time depends on:
          • Selected product/item
          • Current kitchen demand
        - No fixed ETA — provided at order confirmation
  `,
    "info:ask_delivery_method": `
        DELIVERY OPTIONS
        - 🚶 Para retirar: Pick up at establishment
        - 🛵 Para llevar: Home delivery available
        - Method selected during order placement
  `,
  };

  const fallback = `
    AVAILABLE INFORMATION
    - Location, hours, contact, payment methods
    - Delivery options and pricing policy
    Ask specifically about what you need 😊
  `;

  // Fallback: información general mínima si no hay match
  const relevantSection = sections[intentKey] || fallback;

  return `${base}\n\n${relevantSection.trim()}`;
}
