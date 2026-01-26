import { TimeWindow } from "@/infraestructure/http/cms";

/**
 * @example
 * Día de la reserva: 15 de octubre de 2023
 *
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
  if (slots.length === 0) {
    return "No hay horarios disponibles para este día.";
  }

  // Obtener la fecha del primer slot para el encabezado
  const firstSlotDate = new Date(slots[0].from);
  const formattedDate = firstSlotDate.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dateHeader = `El día ${formattedDate}\n\n`;

  const slotsText = slots
    .map((slot) => {
      const from = new Date(slot.from);
      const to = new Date(slot.to);

      const label =
        from.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }) +
        " - " +
        to.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        });

      const free = capacity - slot.totalPeople;

      if (free <= 0) {
        return `${label}  🔴 Lleno`;
      }
      return `${label}  🟢 Disponible para ${free} personas`;
    })
    .join("\n");

  return dateHeader + slotsText;
}
