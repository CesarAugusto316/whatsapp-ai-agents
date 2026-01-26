import { TimeWindow } from "@/infraestructure/http/cms";

/**
 * @example
 * 15:00 - 16:00  🔴 Lleno
 * 16:00 - 17:00  🔴 Lleno
 * 17:00 - 18:00  🟢 Disponible para 10 personas
 *
 * lines.join("\n"); // para apps de mensajería
 * @param slots
 * @param capacity
 * @param locale
 * @returns
 */
export function formatAvailability(
  slots: TimeWindow[],
  capacity: number,
  locale = "es-EC",
): string {
  //
  return slots
    .map((slot) => {
      const from = new Date(slot.from);
      const to = new Date(slot.to);

      const label =
        from.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }) +
        " - " +
        to.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

      const free = capacity - slot.totalPeople;

      if (free <= 0) {
        return `${label}  🔴 Lleno`;
      }
      return `${label}  🟢 Disponible para ${free} personas`;
    })
    .join("\n");
}
