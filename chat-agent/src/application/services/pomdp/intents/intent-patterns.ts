import type { BookingIntentKey, ProductIntentKey } from "./intent.types";

/**
 * Patrones regex para detección de intents de acción explícita (CRUD).
 *
 * Filosofía:
 * - Verbos explícitos > frases contextuales
 * - Precisión > cobertura
 * - Mantenibilidad > cleverness
 *
 * ⚠️ NO incluye intents de búsqueda/recomendación → usar embeddings
 */

export type IntentRegexMap = {
  [K in BookingIntentKey | ProductIntentKey]?: RegExp;
};

// ============================================
// UTILS - Normalización básica
// ============================================

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim();

// ============================================
// PATTERNS - Construidos para legibilidad
// ============================================

const MODAL_VERBS = "(quiero|necesito|voy a|me gustaria|puedo|deseo)";
const POSSESSIVES = "(mi |la |el |un |una )?";
const CONFIRMATION = "(ahora|ya|listo)";

export const intentPatterns: IntentRegexMap = {
  // ============================================
  // BOOKING INTENTS
  // ============================================

  /**
   * booking:create - Requiere verbo de creación + objeto de reserva
   * Evita falsos positivos exigiendo verbo explícito
   */
  "booking:create": new RegExp(
    `^${MODAL_VERBS} (hacer |dejar |apartar |asegurar )?${POSSESSIVES}(reserva|mesa|lugar|cupo)|` +
      `(reservar|pillar|bloquear|guardar) (mesa|lugar|cupo|turno|espacio)|` +
      `dejame apartado|` +
      `guarda lugar para (mi|nosotros)|` +
      `bloquea un espacio|` +
      `necesito un turno$`,
    "i",
  ),

  /**
   * booking:modify - Requiere verbo de cambio + objeto de reserva
   * Excluye "reprogramar" solo (demasiado ambiguo)
   */
  "booking:modify": new RegExp(
    `^${MODAL_VERBS} (cambiar|modificar|ajustar|mover|adelantar|atrasar|correr|recorrer) ${POSSESSIVES}(reserva|turno|horario)|` +
      `(cambiar|modificar|mover) ${POSSESSIVES}(reserva|turno)|` +
      `mover para otro (dia|día)$`,
    "i",
  ),

  /**
   * booking:cancel - REQUIERE verbo explícito de cancelación
   * Eliminados: "me he liado", "algo ha surgido" (demasiado contextuales)
   */
  "booking:cancel": new RegExp(
    `^${MODAL_VERBS} (cancelar|anular|desmarcar|quitar|eliminar) ${POSSESSIVES}reserva|` +
      `(cancelar|anular|quitar) ${POSSESSIVES}reserva|` +
      `dar de baja (la )?reserva|` +
      `ya no (puedo ir|voy a ir)( a la reserva)?$`,
    "i",
  ),

  // ============================================
  // RESTAURANT INTENTS
  // ============================================

  /**
   * restaurant:view_menu - Verbo de visualización + menú/carta/opciones
   */
  "restaurant:view_menu": new RegExp(
    `^${MODAL_VERBS} (ver|consultar|revisar) (el |la )?(menu|carta)|` +
      `(muestrame|ensename|dame|ver) (las )?(opciones|menu|carta)|` +
      `que (tienen|hay|venden|ofrecen)( hoy)?( para (comer|cenar|almorzar))?|` +
      `(menu|carta) del (dia|día)|` +
      `opciones (de la carta|del menu)$`,
    "i",
  ),

  /**
   * restaurant:place_order - Verbo de pedido + confirmación implícita
   */
  "restaurant:place_order": new RegExp(
    `^${MODAL_VERBS} (hacer |realizar )?(un )?(pedido|orden)|` +
      `(pedir|ordenar) (${CONFIRMATION}|comida|para (llevar|domicilio))|` +
      `listo para (pedir|ordenar)|` +
      `hacer el pedido (ya|ahora)$`,
    "i",
  ),

  /**
   * restaurant:update_order - Verbo de modificación + pedido/orden
   */
  "restaurant:update_order": new RegExp(
    `^${MODAL_VERBS} (cambiar|modificar|ajustar|actualizar|corregir) ${POSSESSIVES}(pedido|orden)|` +
      `(cambiar|modificar|ajustar) ${POSSESSIVES}(pedido|orden)|` +
      `cambiar algo del pedido|` +
      `(agregar|quitar|añadir|sacar)( al | del | a mi | de mi )?(pedido|orden)$`,
    "i",
  ),

  /**
   * restaurant:cancel_order - REQUIERE verbo explícito o negación clara
   * Corregido: "recogerlo" ahora es opcional con artículo
   */
  "restaurant:cancel_order": new RegExp(
    `^${MODAL_VERBS} (cancelar|anular|desmarcar|eliminar) ${POSSESSIVES}(pedido|orden)|` +
      `(cancelar|anular|quitar) ${POSSESSIVES}(pedido|orden)|` +
      `ya no quiero (${POSSESSIVES}(pedido|orden|comida)|recogerlo)|` +
      `no quiero (${POSSESSIVES}(pedido|orden)|recogerlo)$`,
    "i",
  ),
};

// ============================================
// DETECTION - Con normalización y prioridad
// ============================================

/**
 * Detecta un único intent con prioridad por especificidad.
 * Los patrones más específicos deben ir primero en el mapa.
 */
export function detectIntent(text: string): keyof IntentRegexMap | null {
  if (!text || text.trim().length < 3) return null;

  const normalized = normalize(text);

  // Orden de prioridad: cancel > modify > create (más específico a menos)
  const priorityOrder: (keyof IntentRegexMap)[] = [
    "booking:cancel",
    "restaurant:cancel_order",
    "booking:modify",
    "restaurant:update_order",
    "booking:create",
    "restaurant:place_order",
    "restaurant:view_menu",
  ];

  for (const intentKey of priorityOrder) {
    const pattern = intentPatterns[intentKey];
    if (pattern && pattern.test(normalized)) {
      return intentKey;
    }
  }

  return null;
}

/**
 * Detecta todos los intents que matchean (para debugging/colisiones).
 */
export function detectAllIntents(text: string): (keyof IntentRegexMap)[] {
  if (!text || text.trim().length < 3) return [];

  const normalized = normalize(text);
  const detected: (keyof IntentRegexMap)[] = [];

  for (const [intentKey, pattern] of Object.entries(intentPatterns)) {
    if (pattern && pattern.test(normalized)) {
      detected.push(intentKey as keyof IntentRegexMap);
    }
  }

  return detected;
}

/**
 * Verifica colisiones entre intents para un texto dado.
 * Útil para tests y debugging de ambigüedad.
 */
export function detectCollisions(text: string): (keyof IntentRegexMap)[] {
  const all = detectAllIntents(text);
  return all.length > 1 ? all : [];
}
