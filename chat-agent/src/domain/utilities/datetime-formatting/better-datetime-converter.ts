import { format, fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 *
 * Convierte fecha y hora de formato ISO a formato legible en español
 * usando la API Intl (solución recomendada).
 * @param input Objeto con date (YYYY-MM-DD) y time (HH:MM:SS)
 * @returns Objeto con fecha y hora formateadas en español
 */
export function formatLocalDateTime(
  input?: {
    date: string;
    time: string;
  },
  timeZone?: string, // there is a problem with timezones, days can be increased or decreased
) {
  if (!input) return { date: "", time: "" };
  const { date, time } = input;

  // 1. Crear objeto Date a partir de la cadena ISO
  // Nota: Asume que la fecha viene en UTC/hora local. Ajusta si es necesario.
  const dateObj = new Date(`${date}T${time}`);

  // 2. Configurar el formateador de fecha en español
  const dateFormatter = new Intl.DateTimeFormat("es-ES", {
    // timeZone: timeZone || "Europa/Madrid",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 3. Formatear la fecha (resultado: "2 de enero de 2026")
  const formattedDate = dateFormatter.format(dateObj);

  // 4. Opcional: Reemplazar "de" por "del" para el formato tradicional
  // La API genera "2 de enero de 2026". Si prefieres "2 de enero del 2026":
  const finalDate = formattedDate.replace(/de (\d{4})$/, "del $1");

  // 5. Formatear la hora (eliminar segundos)
  const formattedTime = time.slice(0, 5); // "20:00"

  return {
    date: finalDate,
    time: formattedTime,
  };
}

export function toUTC(
  dateTime: { date: string; time: string },
  timeZone: string,
): string {
  const { date, time } = dateTime;

  // 1. Crear un string ISO completo SIN zona horaria
  const localISO = `${date}T${time}`;

  // 2. fromZonedTime espera un Date o string que represente la hora LOCAL en esa zona
  const utcDate = fromZonedTime(localISO, timeZone);

  // 3. Devolver como string ISO UTC
  return utcDate.toISOString();
}

// UTC → local
export function toLocalDateTime(utcISO: string, timeZone: string) {
  const localDate = toZonedTime(utcISO, timeZone);
  return {
    date: format(localDate, "yyyy-MM-dd", { timeZone }),
    time: format(localDate, "HH:mm:ss", { timeZone }),
  };
}
