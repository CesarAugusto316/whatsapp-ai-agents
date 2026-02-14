import { BeliefIntent } from "@/application/services/pomdp";
import { Business, Day } from "@/infraestructure/adapters/cms";

/**
 *
 * Template engine para respuestas info sin LLM
 * Variación controlada mediante rotación cíclica + sinónimos
 * Basado en: hash simple del timestamp + businessId para aleatoriedad determinista
 */
export function generateInfoResponse(
  intent: BeliefIntent,
  business: Business,
): string | undefined {
  //
  const { module, intentKey } = intent;

  if (module !== "informational") {
    throw new Error("Invalid module, expected 'informational'");
  }

  // Fórmula matemática para aleatoriedad determinista (sin Math.random)
  // Basada en: últimos 3 dígitos del timestamp actual + businessId length
  const seed = (Date.now() % 1000) + business.id.length;
  const randIndex = (n: number) => seed % n;

  // Helper para formatear horas (open/close en formato 24h → "09:00-14:00")
  const formatHours = (slots: Day[] | null | undefined): string => {
    if (!slots || slots.length === 0) return "cerrado hoy";
    return slots
      .map(
        (slot) =>
          `${String(slot.open).padStart(2, "0")}:00-${String(slot.close).padStart(2, "0")}:00`,
      )
      .join(" y ");
  };

  // Helper para sinónimos controlados (evita alucinaciones)
  const synonyms = {
    location: ["en", "ubicados en", "situados en", "encontrarnos en"],
    hours: ["abrimos", "atendemos", "estamos abiertos"],
    contact: ["contactar", "llamar", "escribirnos"],
    payment: ["aceptamos", "recibimos", "permitimos"],
  };

  switch (intentKey) {
    case "info:ask_location": {
      const addr =
        business.general.address?.trim() || "dirección no disponible";
      const templates = [
        `Estamos ${synonyms.location[randIndex(4)]} ${addr}`,
        `📍 ${addr}`,
        `Nuestra ubicación: ${addr}`,
        `Puedes encontrarnos ${synonyms.location[randIndex(4)]} ${addr}`,
      ];
      return templates[randIndex(4)];
    }

    case "info:ask_business_hours": {
      // Obtener día actual en timezone del negocio (sin librerías externas)
      const now = new Date();
      const tzDate = new Date(
        now.toLocaleString("en-US", { timeZone: business.general.timezone }),
      );
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const today = dayNames[tzDate.getDay()] as keyof typeof business.schedule;

      const hours = formatHours(business.schedule[today] as Day[]);
      const templates = [
        `Hoy ${synonyms.hours[randIndex(3)]} de ${hours}`,
        `⏰ Horario de hoy: ${hours}`,
        `${hours} es nuestro horario hoy`,
        `Estamos ${hours} hoy`,
      ];
      return templates[randIndex(4)];
    }

    case "info:ask_payment_methods": {
      // Inferir métodos por país (sin campo explícito en schema)
      const country = business.general.country;
      const methods =
        country === "ES"
          ? "efectivo, tarjeta y Bizum"
          : ["COL", "EC", "PE"].includes(country || "")
            ? "efectivo, tarjeta, Nequi y Daviplata"
            : "efectivo y tarjeta";

      const templates = [
        `${synonyms.payment[randIndex(3)]} ${methods}`,
        `Formas de pago: ${methods}`,
        `💳 ${methods}`,
        `Puedes pagar con ${methods}`,
      ];
      return templates[randIndex(4)];
    }

    case "info:ask_contact": {
      const phone =
        business.general.phoneNumber?.trim() || "teléfono no disponible";
      const templates = [
        `Puedes ${synonyms.contact[randIndex(3)]} al ${phone}`,
        `📞 ${phone}`,
        `Nuestro contacto: ${phone}`,
        `Escríbenos al ${phone}`,
      ];
      return templates[randIndex(4)];
    }

    case "info:ask_price": {
      // Nota crítica: Esta intención NO genera respuesta final aquí
      // El policy engine debe llamar a API de productos/reservas y luego:
      //   1. Obtener precio real
      //   2. Formatear con currency/taxes
      //   3. Usar template minimalista tipo: `El precio es ${amount} ${currency}`
      // Este placeholder evita alucinaciones del LLM mientras se espera API
      return "Déjame consultar los precios actuales para ti...";
    }
  }
}
