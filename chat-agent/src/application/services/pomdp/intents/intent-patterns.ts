import type {
  BookingIntentKey,
  InformationalIntentKey,
  RestaurantIntentKey,
} from "./intent.types";

// ============================================
// PATRONES REGEX PARA DETECCIÓN RÁPIDA
// ============================================
//
// Estructura: (verbos|sinónimos) + (objeto|palabras clave)
//
// Caracteres especiales:
// - \b → word boundary (evita match parcial)
// - (a|b|c) → grupo de alternativas
// - ? → opcional
// - .* → cualquier texto entre palabras
// - i → case insensitive
//
// ============================================

export interface IntentPattern {
  intentKey: BookingIntentKey | RestaurantIntentKey | InformationalIntentKey;
  module: string;
  // Patrón regex como string (se compila con new RegExp(pattern, 'i'))
  pattern: string;
  // Descripción del patrón para debugging
  description: string;
}

// ============================================
// BOOKING PATTERNS
// ============================================

const bookingPatterns: IntentPattern[] = [
  {
    intentKey: "booking:create",
    module: "booking",
    // (quiero|necesito|me gustaría|voy a|puedo) + (hacer|reservar|apartar|guardar|bloquear) + (reserva|mesa|lugar|sitio)
    pattern:
      "(quiero|necesito|me gustaría|me encantaría|voy a|puedo|deseo|quisiera).*(hacer|reservar|apartar|guardar|bloquear|asegurar|dejar|pillar|agendar).*(reserva|mesa|lugar|sitio|turno|cupo|espacio|cita)|(reservar|apartar|guardar|bloquear|agendar).*(mesa|lugar|sitio|cupo)|(déjame|guarda|bloquea).*(apartado|lugar|espacio|cupo)",
    description:
      "Usuario quiere crear una nueva reserva (verbo de deseo + verbo de acción + objeto)",
  },
  {
    intentKey: "booking:modify",
    module: "booking",
    // (cambiar|modificar|mover|ajustar|reprogramar|adelantar|atrasar|correr|recorrer) + (reserva|mesa|hora|turno)
    pattern:
      "(cambiar|modificar|mover|ajustar|reprogramar|adelantar|atrasar|correr|recorrer|empujar|actualizar|editar).*(reserva|mesa|hora|turno|horario|fecha|cita)",
    description:
      "Usuario quiere modificar una reserva existente (verbo de cambio + objeto)",
  },
  {
    intentKey: "booking:cancel",
    module: "booking",
    // (cancelar|anular|quitar|eliminar|borrar|desmarcar) + (reserva|mesa|cita)
    // O expresiones: "ya no puedo", "no voy a poder", "me he liado", "se me complicó"
    pattern:
      "(cancelar|anular|quitar|eliminar|borrar|desmarcar).*(reserva|mesa|cita|pedido)|(ya no puedo|no voy a poder|no voy a llegar|ya no voy|me he liado|algo surgió|se me complicó|me cancelaron planes)",
    description:
      "Usuario quiere cancelar una reserva (verbo de cancelación + objeto O expresión de imposibilidad)",
  },
  {
    intentKey: "booking:check_availability",
    module: "booking",
    // (hay|queda|tienen|está) + (disponible|libre|hueco|sitio|lugar)
    // O: "qué horarios tienen libres", "mesas disponibles"
    pattern:
      "(hay|queda|quedan|tienen|tenéis|está|están).*(disponible|libre|hueco|sitio|lugar|cupo|mesa|espacio|turno)|(qué horarios|qué días|qué fechas|mesas disponibles|hay disponibilidad|queda sitio|tenéis hueco)",
    description:
      "Usuario consulta disponibilidad (verbo de existencia + objeto disponible O pregunta por horarios)",
  },
];

// ============================================
// RESTAURANT PATTERNS
// ============================================

const restaurantPatterns: IntentPattern[] = [
  {
    intentKey: "restaurant:view_menu",
    module: "restaurant",
    // (ver|mirar|mostrar|enseñar|conocer) + (menú|carta|opciones|platos)
    pattern:
      "(ver|mirar|mostrar|enseñar|conocer|muéstrame|enséñame|dame).*(menú|carta|opciones|platos|comida|bebida|variedad)|(quiero ver|qué venden|qué ofrecen|qué tienen).*(menú|carta|comida|platos|opciones)",
    description:
      "Usuario quiere ver el menú o carta (verbo de visualización + objeto)",
  },
  {
    intentKey: "restaurant:place_order",
    module: "restaurant",
    // (hacer|realizar|pedir|ordenar) + (pedido|orden|comida)
    // O: "quiero pedir", "voy a pedir", "listo para pedir"
    pattern:
      "(hacer|realizar|pedir|ordenar).*(pedido|orden|compra|comida|plato)|(quiero|hago|necesito|deseo|voy a).*(pedir|ordenar|hacer un pedido|hacer una orden)|listo para pedir",
    description:
      "Usuario quiere hacer un pedido (verbo de acción + objeto O expresión de intención de pedir)",
  },
  {
    intentKey: "restaurant:find_dishes",
    // (busco|buscar|encuentro|tienen) + (plato|comida|algo) + (atributo)
    module: "restaurant",
    pattern:
      "(busco|buscar|encuentro|tienen|hay|me dan).*(plato|comida|algo|opción|platos).*(vegetariano|vegano|picante|saludable|ligero|económico|barato|rápido|tradicional|típico|sin gluten|sin lactosa)|(qué tienen|opciones).*(vegetariano|vegano|sin gluten|sin lactosa)",
    description:
      "Usuario busca platos por atributo específico (verbo de búsqueda + objeto + atributo)",
  },
  {
    intentKey: "restaurant:recommend_dishes",
    module: "restaurant",
    // (recomendar|sugerir|lo mejor|lo más pedido|popular|estrella|típico)
    pattern:
      "(recomendar|sugerir|aconsejar|lo mejor|lo más pedido|lo más popular|lo más vendido|plato estrella|especialidad|típico|qué me recomiendan|qué me recomiendas|qué piden)",
    description:
      "Usuario pide recomendaciones (verbo de recomendación O superlativos)",
  },
  {
    intentKey: "restaurant:update_order",
    module: "restaurant",
    // (cambiar|modificar|ajustar|agregar|quitar|corregir) + (pedido|orden)
    pattern:
      "(cambiar|modificar|ajustar|agregar|quitar|corregir|actualizar|añadir|editar).*(pedido|orden|compra)",
    description:
      "Usuario quiere modificar un pedido existente (verbo de modificación + objeto)",
  },
  {
    intentKey: "restaurant:cancel_order",
    module: "restaurant",
    // (cancelar|anular|eliminar|borrar) + (pedido|orden|comida)
    // O: "ya no quiero el pedido"
    pattern:
      "(cancelar|anular|eliminar|borrar|desmarcar).*(pedido|orden|comida|compra)|(ya no quiero|no quiero).*(pedido|orden|comida|la orden)|(quiero).*(cancelar).*(pedido|orden)",
    description:
      "Usuario quiere cancelar un pedido (verbo de cancelación + objeto O expresión de rechazo)",
  },
];

// ============================================
// INFORMATIONAL PATTERNS
// ============================================

const informationalPatterns: IntentPattern[] = [
  {
    intentKey: "info:ask_location",
    module: "informational",
    // (dónde|donde|ubicación|dirección|llegar|cómo llegar) + (local|negocio)
    pattern:
      "(dónde|donde|ubicación|dirección|cómo llegar|en qué calle|queda|quedan|está|están).*(local|negocio|restaurante|establecimiento|tienda)|(cuál es la dirección|cuál es su ubicación|dónde está ubicado|cómo llego)",
    description:
      "Usuario pregunta por ubicación o dirección (palabra de ubicación + objeto O pregunta directa)",
  },
  {
    intentKey: "info:ask_business_hours",
    module: "informational",
    // (hora|horario|abierto|abren|cierran|atención)
    pattern:
      "(hora|horario|abierto|abren|cierran|atención|apertura|cierra)|(a qué hora|cuál es el horario|cuándo abren|cuándo cierran|están abiertos)",
    description:
      "Usuario pregunta por horarios (palabra de tiempo + verbo O pregunta directa)",
  },
  {
    intentKey: "info:ask_payment_methods",
    module: "informational",
    // (pago|pagar|tarjeta|efectivo|método|aceptan)
    pattern:
      "(pago|pagar|tarjeta|efectivo|método|forma|aceptan|aceptáis|puedo pagar).*(tarjeta|efectivo|pago|dinero|bizum|nequi|daviplata)|(qué métodos de pago|qué formas de pago|aceptan tarjeta|aceptan efectivo)",
    description:
      "Usuario pregunta por métodos de pago (palabra de pago + método O pregunta directa)",
  },
  {
    intentKey: "info:ask_contact",
    module: "informational",
    // (contacto|contactar|teléfono|whatsapp|correo|email|instagram|redes)
    pattern:
      "(contacto|contactar|teléfono|whatsapp|correo|email|instagram|redes|número|llamar|hablar).*(local|negocio|ustedes)|(cómo contactarlos|cómo contactar|tienen teléfono|tienen whatsapp|correo del negocio|redes sociales)",
    description:
      "Usuario pregunta por información de contacto (palabra de contacto + objeto O pregunta directa)",
  },
  {
    intentKey: "info:ask_price",
    module: "informational",
    // (cuánto|cuanto|precio|costo|valor|cuesta|vale|sale)
    pattern:
      "(cuánto|cuanto|precio|costo|valor|cuesta|vale|sale|cobran|tarifa).*(cuesta|vale|sale|precio|costo|esto|eso|todo|menú|plato)|(a cuánto sale|cuál es el precio|cuánto cuesta|cuánto me cobran)",
    description:
      "Usuario pregunta por precios (palabra de precio + verbo/objeto O pregunta directa)",
  },
  {
    intentKey: "info:ask_delivery_time",
    module: "informational",
    // (cuánto|tiempo|tarda|demora|llega|entrega)
    pattern:
      "(cuánto|tiempo|tarda|demora|llega|entrega|reparto|falta).*(tarda|demora|llega|entrega|reparto|llegar)|(en cuánto tiempo|cuánto tarda|cuánto demora|cuándo llega|tiempo de entrega|tiempo de llegada)",
    description:
      "Usuario pregunta por tiempo de entrega (palabra de tiempo + verbo O pregunta directa)",
  },
  {
    intentKey: "info:ask_delivery_method",
    module: "informational",
    // (entrega|domicilio|llevar|recoger|retirar|delivery|para llevar)
    pattern:
      "(entrega|domicilio|llevar|recoger|retirar|delivery|reparto|para llevar|envío).*(domicilio|llevar|recoger|delivery|tienda)|(hacen delivery|hacen domicilio|entregan a domicilio|puedo recoger|para llevar)",
    description:
      "Usuario pregunta por métodos de entrega (palabra de entrega + método O pregunta directa)",
  },
];

// ============================================
// EXPORT COMBINADO
// ============================================
// Orden importante: los patrones más específicos primero
// restaurant:cancel_order debe ir antes de booking:cancel porque ambos pueden contener "pedido"

export const intentPatterns: IntentPattern[] = [
  // Restaurant primero (más específico para "pedido" como comida)
  ...restaurantPatterns,
  // Booking después
  ...bookingPatterns,
  // Informational al final (muy genérico)
  ...informationalPatterns,
];

// ============================================
// HELPER: Testear si un mensaje matchea un patrón
// ============================================

export function matchIntentPattern(
  message: string,
): { pattern: IntentPattern; match: RegExpMatchArray } | null {
  const normalizedMessage = message.toLowerCase().trim();

  for (const pattern of intentPatterns) {
    try {
      const regex = new RegExp(pattern.pattern, "i");
      const match = normalizedMessage.match(regex);
      if (match) {
        return { pattern, match };
      }
    } catch (error) {
      console.error(
        `Error compilando patrón para ${pattern.intentKey}:`,
        error,
      );
    }
  }

  return null;
}

// ============================================
// HELPER: Obtener todos los patrones de un módulo
// ============================================

export function getPatternsByModule(module: string): IntentPattern[] {
  return intentPatterns.filter((p) => p.module === module);
}
