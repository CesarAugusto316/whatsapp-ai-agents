import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { shouldSkipEmbedding } from "@/application/services/pomdp";

const DATA_DIR = __dirname;

/**
 * Lee todas las líneas de un archivo de datos, ignorando comentarios y líneas vacías
 */
function readDataFile(filePath: string): string[] {
  const content = readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * Obtiene todos los archivos de datos para una categoría
 */
function getDataFiles(category: string): string[] {
  const files = readdirSync(DATA_DIR);
  return files
    .filter((file) => file.startsWith(`${category}.`))
    .map((file) => join(DATA_DIR, file));
}

/**
 * Colecta todos los inputs de prueba de una categoría
 */
function collectInputs(
  category: string,
): Array<{ input: string; file: string }> {
  const files = getDataFiles(category);
  return files.flatMap((file) =>
    readDataFile(file).map((input) => ({
      input,
      file: file.split("/").pop() || "",
    })),
  );
}

describe("shouldSkipProcessing - Comprehensive Tests", () => {
  describe("Social Protocols - Should Skip", () => {
    const greetings = collectInputs("greeting");
    const goodbyes = collectInputs("goodbye");
    const thanks = collectInputs("thanks");

    it.each(greetings)("should skip greeting: $input", ({ input }) => {
      const result = shouldSkipEmbedding(input);
      expect(result.skip).toBe(true);
      expect(result.kind).toBe("social-protocol");
      expect(result.msg).toBe("social:greeting");
    });

    it.each(goodbyes)("should skip goodbye: $input", ({ input }) => {
      const result = shouldSkipEmbedding(input);
      expect(result.skip).toBe(true);
      expect(result.kind).toBe("social-protocol");
      expect(result.msg).toBe("social:goodbye");
    });

    it.each(thanks)("should skip thanks: $input", ({ input }) => {
      const result = shouldSkipEmbedding(input);
      expect(result.skip).toBe(true);
      expect(result.kind).toBe("social-protocol");
      expect(result.msg).toBe("social:thanks");
    });
  });

  describe("Conversational Signals - Should Skip", () => {
    const affirmations = collectInputs("affirmation");
    const negations = collectInputs("negation");
    const uncertainties = collectInputs("uncertainty");

    it.each(affirmations)("should skip affirmation: $input", ({ input }) => {
      const result = shouldSkipEmbedding(input);
      expect(result.skip).toBe(true);
      expect(result.kind).toBe("conversational-signal");
      expect(result.msg).toBe("signal:affirmation");
    });

    it.each(negations)("should skip negation: $input", ({ input }) => {
      const result = shouldSkipEmbedding(input);
      expect(result.skip).toBe(true);
      expect(result.kind).toBe("conversational-signal");
      expect(result.msg).toBe("signal:negation");
    });

    it.each(uncertainties.filter((u) => !u.input.includes("asi")))(
      "should skip uncertainty: $input",
      ({ input }) => {
        const result = shouldSkipEmbedding(input);
        expect(result.skip).toBe(true);
        expect(result.kind).toBe("conversational-signal");
        expect(result.msg).toBe("signal:uncertainty");
      },
    );

    // Test especial para "mas o menos asi" (4 palabras - no debe skip)
    it("should NOT skip 'mas o menos asi' (4 words)", () => {
      const result = shouldSkipEmbedding("mas o menos asi");
      expect(result.skip).toBe(false);
    });
  });

  describe("Message Length - Should NOT Skip", () => {
    const longMessages = [
      "hola cómo estás hoy",
      "buenos días qué tal",
      "quiero hacer una reserva para mañana",
      "me gustaría reservar una mesa",
      "tienen disponibilidad para el viernes",
      "quiero cambiar mi reserva",
      "puedo cancelar mi reservación",
      "a qué hora abren el sábado",
      "dónde están ubicados exactamente",
      "cuál es el menú del día",
      "tienen opciones vegetarianas",
      "aceptan tarjetas de crédito",
      "tienen estacionamiento disponible",
      "puedo llevar a mi mascota",
      "hacen reservas para grupos grandes",
      "cuál es el código de vestimenta",
      "tienen menú para niños",
      "puedo hacer una reserva especial",
      "me alérgico a los mariscos",
      "tienen vino en la carta",
    ];

    it.each(longMessages.map((msg) => ({ input: msg })))(
      "should NOT skip long message: $input",
      ({ input }) => {
        const result = shouldSkipEmbedding(input);
        expect(result.skip).toBe(false);
        expect(result.kind).toBeNull();
        expect(result.msg).toBeNull();
      },
    );
  });

  describe("Unrecognized Messages - Should NOT Skip", () => {
    const unrecognizedMessages = [
      "qué hora es",
      "dónde están ubicados",
      "cuál es el precio",
      "tienen wifi",
      "hacen delivery",
      "puedo pagar con paypal",
      "cuánto tiempo de espera",
      "tienen promoción hoy",
      "puedo cambiar mi reserva",
      "me llegó un correo de confirmación",
      "olvidé mi número de reserva",
      "puedo modificar la cantidad de personas",
      "tienen menú sin gluten",
      "aceptan propinas",
      "cuál es el plato típico",
    ];

    it.each(unrecognizedMessages.map((msg) => ({ input: msg })))(
      "should NOT skip unrecognized: $input",
      ({ input }) => {
        const result = shouldSkipEmbedding(input);
        expect(result.skip).toBe(false);
        expect(result.kind).toBeNull();
        expect(result.msg).toBeNull();
      },
    );
  });

  describe("Edge Cases", () => {
    it("should handle empty string", () => {
      const result = shouldSkipEmbedding("");
      expect(result.skip).toBe(false);
      expect(result.kind).toBeNull();
      expect(result.msg).toBeNull();
    });

    it("should handle whitespace only", () => {
      const result = shouldSkipEmbedding("   ");
      expect(result.skip).toBe(false);
      expect(result.kind).toBeNull();
      expect(result.msg).toBeNull();
    });

    it("should handle tabs and newlines", () => {
      const result = shouldSkipEmbedding("\t\n");
      expect(result.skip).toBe(false);
      expect(result.kind).toBeNull();
      expect(result.msg).toBeNull();
    });

    it("should trim before processing", () => {
      const result = shouldSkipEmbedding("  hola  ");
      expect(result.skip).toBe(true);
      expect(result.kind).toBe("social-protocol");
    });

    it("should handle single character", () => {
      const result = shouldSkipEmbedding("h");
      expect(result.skip).toBe(false);
    });

    it("should handle numbers", () => {
      const result = shouldSkipEmbedding("123");
      expect(result.skip).toBe(false);
    });

    it("should handle special characters", () => {
      const result = shouldSkipEmbedding("!!!");
      expect(result.skip).toBe(false);
    });

    it("should handle emojis", () => {
      const result = shouldSkipEmbedding("👋");
      expect(result.skip).toBe(false);
    });

    it("should handle mixed languages", () => {
      const result = shouldSkipEmbedding("hello hola");
      expect(result.skip).toBe(false);
    });
  });

  describe("Case Insensitivity", () => {
    const caseVariations = [
      { input: "HOLA", expected: true },
      { input: "Hola", expected: true },
      { input: "hOlA", expected: true },
      { input: "GRACIAS", expected: true },
      { input: "Gracias", expected: true },
      { input: "CHAU", expected: true },
      { input: "Chau", expected: true },
      { input: "SI", expected: true },
      { input: "Si", expected: true },
      { input: "NO", expected: true },
      { input: "No", expected: true },
      { input: "DALE", expected: true },
      { input: "Dale", expected: true },
      { input: "VALE", expected: true },
      { input: "Vale", expected: true },
    ];

    it.each(caseVariations)(
      "should match case insensitive: $input",
      ({ input, expected }) => {
        const result = shouldSkipEmbedding(input);
        expect(result.skip).toBe(expected);
      },
    );
  });

  describe("Punctuation Handling", () => {
    const withPunctuation = [
      { input: "hola!", expected: true },
      { input: "hola!!", expected: true },
      { input: "gracias!", expected: true },
      { input: "gracias!!", expected: true },
      { input: "chau!", expected: true },
      { input: "si!", expected: true },
      { input: "no!", expected: true },
      { input: "dale!", expected: true },
      { input: "vale!", expected: true },
      { input: "hola?", expected: false },
      { input: "gracias?", expected: false },
    ];

    it.each(withPunctuation)(
      "should handle punctuation: $input",
      ({ input, expected }) => {
        const result = shouldSkipEmbedding(input);
        expect(result.skip).toBe(expected);
      },
    );
  });

  describe("Return Type Structure", () => {
    it("should return correct structure for social protocol", () => {
      const result = shouldSkipEmbedding("hola");
      expect(result).toHaveProperty("skip");
      expect(result).toHaveProperty("kind");
      expect(result).toHaveProperty("msg");
      expect(typeof result.skip).toBe("boolean");
      expect(result.kind).toBe("social-protocol");
      expect(result.msg).toBe("social:greeting");
    });

    it("should return correct structure for conversational signal", () => {
      const result = shouldSkipEmbedding("si");
      expect(result).toHaveProperty("skip");
      expect(result).toHaveProperty("kind");
      expect(result).toHaveProperty("msg");
      expect(typeof result.skip).toBe("boolean");
      expect(result.kind).toBe("conversational-signal");
      expect(result.msg).toBe("signal:affirmation");
    });

    it("should return correct structure for non-skipped message", () => {
      const result = shouldSkipEmbedding("qué hora es");
      expect(result).toHaveProperty("skip");
      expect(result).toHaveProperty("kind");
      expect(result).toHaveProperty("msg");
      expect(typeof result.skip).toBe("boolean");
      expect(result.skip).toBe(false);
      expect(result.kind).toBeNull();
      expect(result.msg).toBeNull();
    });
  });

  describe("Word Count Boundary", () => {
    it("should skip 1 word messages", () => {
      expect(shouldSkipEmbedding("hola").skip).toBe(true);
      expect(shouldSkipEmbedding("gracias").skip).toBe(true);
      expect(shouldSkipEmbedding("chau").skip).toBe(true);
    });

    it("should skip 2 word messages", () => {
      expect(shouldSkipEmbedding("buenas noches").skip).toBe(true);
      expect(shouldSkipEmbedding("muchas gracias").skip).toBe(true);
      expect(shouldSkipEmbedding("hasta luego").skip).toBe(true);
      expect(shouldSkipEmbedding("que tal").skip).toBe(true);
    });

    it("should skip 3 word messages", () => {
      expect(shouldSkipEmbedding("buenos dias").skip).toBe(true);
      expect(shouldSkipEmbedding("millones de gracias").skip).toBe(true);
      expect(shouldSkipEmbedding("de ninguna manera").skip).toBe(true);
    });

    it("should NOT skip 4+ word messages", () => {
      expect(shouldSkipEmbedding("hola cómo estás hoy").skip).toBe(false);
      expect(shouldSkipEmbedding("buenos días qué tal").skip).toBe(false);
      expect(shouldSkipEmbedding("muchas gracias por todo").skip).toBe(false);
    });
  });

  describe("Regional Variations", () => {
    describe("Mexico", () => {
      it("should recognize Mexican greetings", () => {
        expect(shouldSkipEmbedding("xou").skip).toBe(true);
        expect(shouldSkipEmbedding("quiubo").skip).toBe(true);
      });

      it("should recognize Mexican affirmations", () => {
        expect(shouldSkipEmbedding("simon").skip).toBe(true);
        expect(shouldSkipEmbedding("orale").skip).toBe(true);
      });

      it("should recognize Mexican negations", () => {
        expect(shouldSkipEmbedding("nel").skip).toBe(true);
        expect(shouldSkipEmbedding("nanai").skip).toBe(true);
      });
    });

    describe("Argentina", () => {
      it("should recognize Argentine greetings", () => {
        expect(shouldSkipEmbedding("epa").skip).toBe(true);
      });

      it("should recognize Argentine affirmations", () => {
        expect(shouldSkipEmbedding("dale").skip).toBe(true);
        expect(shouldSkipEmbedding("sip").skip).toBe(true);
      });

      it("should recognize Argentine goodbyes", () => {
        expect(shouldSkipEmbedding("nos vidrios").skip).toBe(true);
      });
    });

    describe("Colombia", () => {
      it("should recognize Colombian greetings", () => {
        expect(shouldSkipEmbedding("quiubo").skip).toBe(true);
        expect(shouldSkipEmbedding("epa").skip).toBe(true);
      });

      it("should recognize Colombian affirmations", () => {
        expect(shouldSkipEmbedding("de una").skip).toBe(true);
        expect(shouldSkipEmbedding("de una vez").skip).toBe(true);
      });
    });

    describe("Spain", () => {
      it("should recognize Spanish greetings", () => {
        expect(shouldSkipEmbedding("holi").skip).toBe(true);
        expect(shouldSkipEmbedding("holis").skip).toBe(true);
      });

      it("should recognize Spanish affirmations", () => {
        expect(shouldSkipEmbedding("vale").skip).toBe(true);
      });
    });
  });

  describe("Performance", () => {
    it("should process quickly", () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        shouldSkipEmbedding("hola");
      }
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});
