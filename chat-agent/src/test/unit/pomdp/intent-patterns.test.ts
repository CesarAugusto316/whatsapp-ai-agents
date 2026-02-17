import { describe, expect, it } from "bun:test";
import {
  intentPatterns,
  detectIntent,
  detectAllIntents,
} from "@/application/services/pomdp/intents/intent-patterns";

describe("Intent Patterns - Regex Detection", () => {
  // ============================================
  // BOOKING:CREATE
  // ============================================
  describe("booking:create", () => {
    const pattern = intentPatterns["booking:create"]!;

    it("should match explicit reservation creation phrases", () => {
      const validPhrases = [
        "quiero hacer una reserva",
        "necesito reservar ahora",
        "quiero apartar lugar",
        "quiero dejar mesa",
        "puedo reservar mesa",
        "quiero pillar mesa",
        "necesito un turno",
        "dejame apartado",
        "guarda lugar para mi",
        "bloquea un espacio",
        "quiero asegurar cupo",
        "voy a reservar",
        "me gustaria reservar",
      ];

      validPhrases.forEach((phrase) => {
        expect(pattern.test(phrase)).toBeTrue();
      });
    });

    it("should not match incomplete or ambiguous phrases", () => {
      const invalidPhrases = [
        "quiero ver",
        "cancelar",
        "me gustaria",
        "reserva",
        "mesa para dos",
      ];

      invalidPhrases.forEach((phrase) => {
        expect(pattern.test(phrase)).toBeFalse();
      });
    });
  });

  // ============================================
  // BOOKING:MODIFY
  // ============================================
  describe("booking:modify", () => {
    const pattern = intentPatterns["booking:modify"]!;

    // it("should match explicit reservation modification phrases", () => {
    //   const validPhrases = [
    //     "quiero cambiar mi reserva",
    //     "necesito modificar la reserva",
    //     "puedo ajustar mi reserva",
    //     "necesito mover la reserva",
    //     "mover la reserva",
    //     "cambiar la reserva",
    //     "adelantar la reserva",
    //     "atrasar la reserva",
    //     "correr la reserva",
    //     "recorrer la reserva",
    //     "mover para otro dia",
    //   ];

    //   validPhrases.forEach((phrase) => {
    //     expect(pattern.test(phrase)).toBeTrue();
    //   });
    // });

    it("should not match unrelated phrases", () => {
      const invalidPhrases = [
        "quiero cancelar",
        "hay disponibilidad",
        "reserva nueva",
        "crear reserva",
        "quiero reprogramar",
        "ajustar el turno",
        "cambiar el horario",
      ];

      invalidPhrases.forEach((phrase) => {
        expect(pattern.test(phrase)).toBeFalse();
      });
    });
  });

  // ============================================
  // BOOKING:CANCEL
  // ============================================
  // describe("booking:cancel", () => {
  //   it("should match explicit reservation cancellation phrases", () => {
  //     const pattern = intentPatterns["booking:cancel"]!;
  //     const validPhrases = [
  //       "cancelar mi reserva",
  //       "quiero anular la reserva",
  //       "ya no voy a ir",
  //       "ya no puedo ir",
  //       "me he liado",
  //       "algo ha surgido",
  //       "se me complico",
  //     ];

  //     validPhrases.forEach((phrase) => {
  //       expect(pattern.test(phrase)).toBeTrue();
  //     });
  //   });

  //   it("should not match unrelated phrases", () => {
  //     const pattern = intentPatterns["booking:cancel"]!;
  //     const invalidPhrases = [
  //       "quiero cambiar",
  //       "modificar reserva",
  //       "nueva reserva",
  //       "no voy",
  //       "quiero cancelar",
  //       "necesito cancelar",
  //       "quita mi reserva",
  //       "desmarca mi reserva",
  //     ];

  //     for (const phrase of invalidPhrases) {
  //       expect(pattern.test(phrase)).toBeFalse();
  //     }
  //   });
  // });

  // ============================================
  // products:find
  // ============================================
  describe("products:find", () => {
    const pattern = intentPatterns["products:find"]!;

    it("should match explicit menu viewing phrases", () => {
      const validPhrases = [
        "quiero ver el menu",
        "puedo ver el menu",
        "muestrame las opciones",
        "quiero ver la carta",
        "que tienen para cenar",
        "que hay de comer",
        "menu del dia",
        "opciones del menu",
        "dame las opciones",
        "que venden hoy",
        "que ofrecen para comer",
      ];

      validPhrases.forEach((phrase) => {
        expect(pattern.test(phrase)).toBeTrue();
      });
    });

    it("should not match unrelated phrases", () => {
      const invalidPhrases = [
        "quiero pedir",
        "el menu es caro",
        "opciones",
        "comida",
        "ensename la carta",
      ];

      invalidPhrases.forEach((phrase) => {
        expect(pattern.test(phrase)).toBeFalse();
      });
    });
  });

  // ============================================
  // orders:create
  // ============================================
  describe("orders:create", () => {
    const pattern = intentPatterns["orders:create"]!;

    it("should match explicit order placement phrases", () => {
      const validPhrases = [
        "quiero hacer un pedido",
        "necesito hacer un pedido",
        "deseo hacer un pedido",
        "voy a hacer pedido",
        "quiero pedir ahora",
        "listo para pedir",
        "voy a pedir comida",
        "quiero pedir para llevar",
        "hacer el pedido ya",
        "quiero realizar pedido",
        "necesito ordenar comida",
        "deseo ordenar ahora",
        "voy a ordenar",
        "quiero ordenar para domicilio",
        "listo para ordenar",
      ];

      validPhrases.forEach((phrase) => {
        expect(pattern.test(phrase)).toBeTrue();
      });
    });

    it("should not match unrelated phrases", () => {
      const invalidPhrases = [
        "quiero ver el menu",
        "el pedido",
        "pedir informacion",
        "quiero hacer una orden",
      ];

      invalidPhrases.forEach((phrase) => {
        expect(pattern.test(phrase)).toBeFalse();
      });
    });
  });

  // ============================================
  // orders:modify
  // ============================================
  // describe("orders:modify", () => {
  //   const pattern = intentPatterns["orders:modify"]!;

  //   it("should match explicit order modification phrases", () => {
  //     const validPhrases = [
  //       "quiero cambiar mi pedido",
  //       "necesito modificar mi pedido",
  //       "quiero ajustar mi pedido",
  //       "cambiar algo del pedido",
  //       "modificar mi orden",
  //       "quiero cambiar el pedido",
  //       "ajustar mi pedido",
  //       "agregar al pedido",
  //       // "quitar del pedido",
  //       "corregir mi pedido",
  //       "cambiar mi orden",
  //       "modificar mi orden",
  //       "agregar a mi orden",
  //       "quitar de mi orden",
  //       "actualizar mi pedido",
  //       "corregir mi orden",
  //     ];

  //     validPhrases.forEach((phrase) => {
  //       expect(pattern.test(phrase)).toBeTrue();
  //     });
  //   });

  //   it("should not match unrelated phrases", () => {
  //     const invalidPhrases = [
  //       "quiero cancelar mi pedido",
  //       "hacer un pedido",
  //       "cambiar",
  //       "mi pedido esta bien",
  //     ];

  //     invalidPhrases.forEach((phrase) => {
  //       expect(pattern.test(phrase)).toBeFalse();
  //     });
  //   });
  // });

  // ============================================
  // orders:cancel
  // ============================================
  describe("orders:cancel", () => {
    const pattern = intentPatterns["orders:cancel"]!;

    it("should match explicit order cancellation phrases", () => {
      const validPhrases = [
        "quiero cancelar mi pedido",
        "necesito cancelar mi pedido",
        "cancelar mi pedido",
        "ya no quiero el pedido",
        "no quiero mi pedido",
        "quiero anular el pedido",
        "anular mi pedido",
        "ya no quiero la comida",
        "quiero cancelar mi orden",
        "anular mi orden",
        "cancelar mi orden",
        "ya no quiero la orden",
        "no quiero mi orden",
      ];

      validPhrases.forEach((phrase) => {
        expect(pattern.test(phrase)).toBeTrue();
      });
    });

    it("should not match unrelated phrases", () => {
      const invalidPhrases = [
        "quiero cambiar mi pedido",
        "cancelar",
        "el pedido",
        "no quiero mas",
      ];

      invalidPhrases.forEach((phrase) => {
        expect(pattern.test(phrase)).toBeFalse();
      });
    });
  });

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  describe("detectIntent", () => {
    it("should return the correct intentKey for a matching phrase", () => {
      expect(detectIntent("quiero hacer una reserva")).toBe("booking:create");
      expect(detectIntent("quiero cancelar mi pedido")).toBe("orders:cancel");
      expect(detectIntent("muestrame las opciones")).toBe("products:find");
    });

    it("should return null for non-matching phrases", () => {
      expect(detectIntent("hola que tal")).toBeNull();
      expect(detectIntent("gracias por todo")).toBeNull();
      expect(detectIntent("frase aleatoria")).toBeNull();
    });
  });

  describe("detectAllIntents", () => {
    it("should return all matching intents", () => {
      const results = detectAllIntents("quiero hacer una reserva");
      expect(results).toContain("booking:create");
    });

    it("should return empty array for non-matching phrases", () => {
      const results = detectAllIntents("hola buen dia");
      expect(results).toHaveLength(0);
    });
  });

  // ============================================
  // CROSS-INTENT DISAMBIGUATION
  // ============================================
  describe("Cross-intent disambiguation", () => {
    it("should distinguish between booking:create and booking:modify", () => {
      const createPattern = intentPatterns["booking:create"]!;
      const modifyPattern = intentPatterns["booking:modify"]!;

      expect(createPattern.test("quiero hacer una reserva")).toBeTrue();
      expect(modifyPattern.test("quiero hacer una reserva")).toBeFalse();

      expect(modifyPattern.test("quiero cambiar mi reserva")).toBeTrue();
      expect(createPattern.test("quiero cambiar mi reserva")).toBeFalse();
    });

    it("should distinguish between orders:create and orders:modify", () => {
      const placePattern = intentPatterns["orders:create"]!;
      const updatePattern = intentPatterns["orders:modify"]!;

      expect(placePattern.test("quiero hacer un pedido")).toBeTrue();
      expect(updatePattern.test("quiero hacer un pedido")).toBeFalse();

      expect(updatePattern.test("quiero cambiar mi pedido")).toBeTrue();
      expect(placePattern.test("quiero cambiar mi pedido")).toBeFalse();
    });

    it("should distinguish between orders:modify and orders:cancel", () => {
      const updatePattern = intentPatterns["orders:modify"]!;
      const cancelPattern = intentPatterns["orders:cancel"]!;

      expect(updatePattern.test("quiero cambiar mi pedido")).toBeTrue();
      expect(cancelPattern.test("quiero cambiar mi pedido")).toBeFalse();

      expect(cancelPattern.test("quiero cancelar mi pedido")).toBeTrue();
      expect(updatePattern.test("quiero cancelar mi pedido")).toBeFalse();
    });
  });
});
