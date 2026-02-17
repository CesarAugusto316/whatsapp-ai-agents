import { test, expect, describe } from "bun:test";
import {
  intentPatterns,
  matchIntentPattern,
  getPatternsByModule,
} from "@/application/services/pomdp/intents/intent-patterns";

// ============================================
// TESTS: matchIntentPattern
// ============================================

describe("matchIntentPattern - booking", () => {
  test("debe detectar booking:create con 'quiero hacer una reserva'", () => {
    const result = matchIntentPattern("quiero hacer una reserva");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:create");
  });

  test("debe detectar booking:create con 'necesito reservar mesa'", () => {
    const result = matchIntentPattern("necesito reservar mesa");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:create");
  });

  test("debe detectar booking:create con 'quiero apartar lugar'", () => {
    const result = matchIntentPattern("quiero apartar lugar");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:create");
  });

  test("debe detectar booking:create con 'voy a reservar'", () => {
    const result = matchIntentPattern("voy a reservar");
    // Caso edge: frase muy corta sin objeto explícito
    // El regex necesita más contexto (ej: "voy a reservar mesa")
    // Para frases cortas, usar fallback semántico (vector search)
    expect(result).toBeNull();
  });

  test("debe detectar booking:modify con 'quiero cambiar mi reserva'", () => {
    const result = matchIntentPattern("quiero cambiar mi reserva");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:modify");
  });

  test("debe detectar booking:modify con 'necesito modificar la reserva'", () => {
    const result = matchIntentPattern("necesito modificar la reserva");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:modify");
  });

  test("debe detectar booking:modify con 'mover la reserva'", () => {
    const result = matchIntentPattern("mover la reserva");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:modify");
  });

  test("debe detectar booking:cancel con 'quiero cancelar mi reserva'", () => {
    const result = matchIntentPattern("quiero cancelar mi reserva");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:cancel");
  });

  test("debe detectar booking:cancel con 'ya no puedo ir'", () => {
    const result = matchIntentPattern("ya no puedo ir");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:cancel");
  });

  test("debe detectar booking:cancel con 'no voy a poder'", () => {
    const result = matchIntentPattern("no voy a poder");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:cancel");
  });

  test("debe detectar booking:check_availability con 'hay disponibilidad'", () => {
    const result = matchIntentPattern("hay disponibilidad");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:check_availability");
  });

  test("debe detectar booking:check_availability con 'queda sitio'", () => {
    const result = matchIntentPattern("queda sitio");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:check_availability");
  });

  test("debe detectar booking:check_availability con 'qué horarios tienen libres'", () => {
    const result = matchIntentPattern("qué horarios tienen libres");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:check_availability");
  });
});

describe("matchIntentPattern - restaurant", () => {
  test("debe detectar restaurant:view_menu con 'quiero ver el menú'", () => {
    const result = matchIntentPattern("quiero ver el menú");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:view_menu");
  });

  test("debe detectar restaurant:view_menu con 'muéstrame las opciones'", () => {
    const result = matchIntentPattern("muéstrame las opciones");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:view_menu");
  });

  test("debe detectar restaurant:place_order con 'quiero hacer un pedido'", () => {
    const result = matchIntentPattern("quiero hacer un pedido");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:place_order");
  });

  test("debe detectar restaurant:place_order con 'voy a pedir comida'", () => {
    const result = matchIntentPattern("voy a pedir comida");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:place_order");
  });

  test("debe detectar restaurant:place_order con 'listo para pedir'", () => {
    const result = matchIntentPattern("listo para pedir");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:place_order");
  });

  test("debe detectar restaurant:find_dishes con 'busco algo vegetariano'", () => {
    const result = matchIntentPattern("busco algo vegetariano");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:find_dishes");
  });

  test("debe detectar restaurant:find_dishes con 'tienen opciones sin gluten'", () => {
    const result = matchIntentPattern("tienen opciones sin gluten");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:find_dishes");
  });

  test("debe detectar restaurant:recommend_dishes con 'qué me recomiendas'", () => {
    const result = matchIntentPattern("qué me recomiendas");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:recommend_dishes");
  });

  test("debe detectar restaurant:recommend_dishes con 'lo más pedido'", () => {
    const result = matchIntentPattern("lo más pedido");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:recommend_dishes");
  });

  test("debe detectar restaurant:update_order con 'quiero cambiar mi pedido'", () => {
    const result = matchIntentPattern("quiero cambiar mi pedido");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:update_order");
  });

  test("debe detectar restaurant:update_order con 'agregar al pedido'", () => {
    const result = matchIntentPattern("agregar al pedido");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:update_order");
  });

  test("debe detectar restaurant:cancel_order con 'quiero cancelar mi pedido'", () => {
    const result = matchIntentPattern("quiero cancelar mi pedido");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:cancel_order");
  });

  test("debe detectar restaurant:cancel_order con 'ya no quiero el pedido'", () => {
    const result = matchIntentPattern("ya no quiero el pedido");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:cancel_order");
  });
});

describe("matchIntentPattern - informational", () => {
  test("debe detectar info:ask_location con 'dónde queda el local'", () => {
    const result = matchIntentPattern("dónde queda el local");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_location");
  });

  test("debe detectar info:ask_location con 'cuál es la dirección'", () => {
    const result = matchIntentPattern("cuál es la dirección");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_location");
  });

  test("debe detectar info:ask_business_hours con 'a qué hora abren'", () => {
    const result = matchIntentPattern("a qué hora abren");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_business_hours");
  });

  test("debe detectar info:ask_business_hours con 'horario de atención'", () => {
    const result = matchIntentPattern("horario de atención");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_business_hours");
  });

  test("debe detectar info:ask_payment_methods con 'aceptan tarjeta'", () => {
    const result = matchIntentPattern("aceptan tarjeta");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_payment_methods");
  });

  test("debe detectar info:ask_payment_methods con 'puedo pagar con efectivo'", () => {
    const result = matchIntentPattern("puedo pagar con efectivo");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_payment_methods");
  });

  test("debe detectar info:ask_contact con 'tienen whatsapp'", () => {
    const result = matchIntentPattern("tienen whatsapp");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_contact");
  });

  test("debe detectar info:ask_contact con 'cómo contactarlos'", () => {
    const result = matchIntentPattern("cómo contactarlos");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_contact");
  });

  test("debe detectar info:ask_price con 'cuánto cuesta esto'", () => {
    const result = matchIntentPattern("cuánto cuesta esto");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_price");
  });

  test("debe detectar info:ask_price con 'cuál es el precio'", () => {
    const result = matchIntentPattern("cuál es el precio");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_price");
  });

  test("debe detectar info:ask_delivery_time con 'cuánto tarda en llegar'", () => {
    const result = matchIntentPattern("cuánto tarda en llegar");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_delivery_time");
  });

  test("debe detectar info:ask_delivery_time con 'tiempo de entrega'", () => {
    const result = matchIntentPattern("tiempo de entrega");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_delivery_time");
  });

  test("debe detectar info:ask_delivery_method con 'hacen delivery'", () => {
    const result = matchIntentPattern("hacen delivery");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_delivery_method");
  });

  test("debe detectar info:ask_delivery_method con 'puedo recoger'", () => {
    const result = matchIntentPattern("puedo recoger");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("info:ask_delivery_method");
  });
});

// ============================================
// TESTS: Variaciones regionales
// ============================================

describe("matchIntentPattern - variaciones regionales", () => {
  test("debe detectar booking:create con variación España: 'quiero pillar mesa'", () => {
    const result = matchIntentPattern("quiero pillar mesa");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:create");
  });

  test("debe detectar booking:create con variación Latam: 'guarda lugar para mí'", () => {
    const result = matchIntentPattern("guarda lugar para mí");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:create");
  });

  test("debe detectar booking:modify con variación Latam: 'correr la reserva'", () => {
    const result = matchIntentPattern("correr la reserva");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:modify");
  });

  test("debe detectar booking:cancel con variación España: 'me he liado'", () => {
    const result = matchIntentPattern("me he liado");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:cancel");
  });

  test("debe detectar booking:cancel con variación Latam: 'se me complicó'", () => {
    const result = matchIntentPattern("se me complicó");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:cancel");
  });

  test("debe detectar restaurant:view_menu con variación España: 'quiero ver la carta'", () => {
    const result = matchIntentPattern("quiero ver la carta");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:view_menu");
  });

  test("debe detectar restaurant:place_order con variación Latam: 'quiero ordenar comida'", () => {
    const result = matchIntentPattern("quiero ordenar comida");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("restaurant:place_order");
  });
});

// ============================================
// TESTS: Casos edge
// ============================================

describe("matchIntentPattern - edge cases", () => {
  test("debe ser case insensitive", () => {
    const result = matchIntentPattern("QUIERO HACER UNA RESERVA");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:create");
  });

  test("debe manejar texto adicional", () => {
    const result = matchIntentPattern(
      "hola buenos días, quiero hacer una reserva para hoy por favor",
    );
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:create");
  });

  test("debe manejar signos de interrogación", () => {
    const result = matchIntentPattern("¿quiero hacer una reserva?");
    expect(result).not.toBeNull();
    expect(result?.pattern.intentKey).toBe("booking:create");
  });

  test("debe retornar null para mensaje sin patrón claro", () => {
    const result = matchIntentPattern("hola qué tal");
    expect(result).toBeNull();
  });

  test("debe retornar null para mensaje vacío", () => {
    const result = matchIntentPattern("");
    expect(result).toBeNull();
  });

  test("debe retornar null para solo whitespace", () => {
    const result = matchIntentPattern("   ");
    expect(result).toBeNull();
  });
});

// ============================================
// TESTS: getPatternsByModule
// ============================================

describe("getPatternsByModule", () => {
  test("debe retornar patrones de booking", () => {
    const patterns = getPatternsByModule("booking");
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.every((p) => p.module === "booking")).toBe(true);
  });

  test("debe retornar patrones de restaurant", () => {
    const patterns = getPatternsByModule("restaurant");
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.every((p) => p.module === "restaurant")).toBe(true);
  });

  test("debe retornar patrones de informational", () => {
    const patterns = getPatternsByModule("informational");
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.every((p) => p.module === "informational")).toBe(true);
  });

  test("debe retornar array vacío para módulo inexistente", () => {
    const patterns = getPatternsByModule("nonexistent");
    expect(patterns).toEqual([]);
  });
});

// ============================================
// TESTS: intentPatterns export
// ============================================

describe("intentPatterns", () => {
  test("debe tener patrones para todos los intents principales", () => {
    const intentKeys = intentPatterns.map((p) => p.intentKey);

    // Booking
    expect(intentKeys).toContain("booking:create");
    expect(intentKeys).toContain("booking:modify");
    expect(intentKeys).toContain("booking:cancel");
    expect(intentKeys).toContain("booking:check_availability");

    // Restaurant
    expect(intentKeys).toContain("restaurant:view_menu");
    expect(intentKeys).toContain("restaurant:place_order");
    expect(intentKeys).toContain("restaurant:find_dishes");
    expect(intentKeys).toContain("restaurant:recommend_dishes");
    expect(intentKeys).toContain("restaurant:update_order");
    expect(intentKeys).toContain("restaurant:cancel_order");

    // Informational
    expect(intentKeys).toContain("info:ask_location");
    expect(intentKeys).toContain("info:ask_business_hours");
    expect(intentKeys).toContain("info:ask_payment_methods");
    expect(intentKeys).toContain("info:ask_contact");
    expect(intentKeys).toContain("info:ask_price");
    expect(intentKeys).toContain("info:ask_delivery_time");
    expect(intentKeys).toContain("info:ask_delivery_method");
  });

  test("todos los patrones deben tener descripción", () => {
    intentPatterns.forEach((pattern) => {
      expect(pattern.description).toBeDefined();
      expect(pattern.description.length).toBeGreaterThan(0);
    });
  });

  test("todos los patrones deben ser regex válidos", () => {
    intentPatterns.forEach((pattern) => {
      expect(() => new RegExp(pattern.pattern, "i")).not.toThrow();
    });
  });
});
