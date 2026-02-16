import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join, basename } from "path";
import {
  socialProtocols,
  conversationalSignals,
  shouldSkipProcessing,
} from "@/application/services/pomdp";

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

describe("Social Protocols & Conversational Signals - Data-Driven Tests", () => {
  describe("Greeting", () => {
    const regex = socialProtocols.greeting;
    const files = getDataFiles("greeting");

    it.each(
      files.flatMap((file) =>
        readDataFile(file).map((input) => ({
          input,
          file: basename(file),
        })),
      ),
    )("should match greeting: $input ($file)", ({ input, file }) => {
      expect(regex.test(input)).toBe(true);
    });
  });

  describe("Goodbye", () => {
    const regex = socialProtocols.goodbye;
    const files = getDataFiles("goodbye");

    it.each(
      files.flatMap((file) =>
        readDataFile(file).map((input) => ({
          input,
          file: basename(file),
        })),
      ),
    )("should match goodbye: $input ($file)", ({ input, file }) => {
      expect(regex.test(input)).toBe(true);
    });
  });

  describe("Thanks", () => {
    const regex = socialProtocols.thanks;
    const files = getDataFiles("thanks");

    it.each(
      files.flatMap((file) =>
        readDataFile(file).map((input) => ({
          input,
          file: basename(file),
        })),
      ),
    )("should match thanks: $input ($file)", ({ input, file }) => {
      expect(regex.test(input)).toBe(true);
    });
  });

  describe("Affirmation", () => {
    const regex = conversationalSignals.affirmation;
    const files = getDataFiles("affirmation");

    it.each(
      files.flatMap((file) =>
        readDataFile(file).map((input) => ({
          input,
          file: basename(file),
        })),
      ),
    )("should match affirmation: $input ($file)", ({ input, file }) => {
      expect(regex.test(input)).toBe(true);
    });
  });

  describe("Negation", () => {
    const regex = conversationalSignals.negation;
    const files = getDataFiles("negation");

    it.each(
      files.flatMap((file) =>
        readDataFile(file).map((input) => ({
          input,
          file: basename(file),
        })),
      ),
    )("should match negation: $input ($file)", ({ input, file }) => {
      expect(regex.test(input)).toBe(true);
    });
  });

  describe("Uncertainty", () => {
    const regex = conversationalSignals.uncertainty;
    const files = getDataFiles("uncertainty");

    it.each(
      files.flatMap((file) =>
        readDataFile(file).map((input) => ({
          input,
          file: basename(file),
        })),
      ),
    )("should match uncertainty: $input ($file)", ({ input, file }) => {
      expect(regex.test(input)).toBe(true);
    });
  });

  describe("shouldSkipProcessing integration", () => {
    const testCases = [
      { input: "hola", expectedSkip: true, expectedKind: "social-protocol" },
      { input: "gracias", expectedSkip: true, expectedKind: "social-protocol" },
      { input: "chau", expectedSkip: true, expectedKind: "social-protocol" },
      {
        input: "si",
        expectedSkip: true,
        expectedKind: "conversational-signal",
      },
      {
        input: "no",
        expectedSkip: true,
        expectedKind: "conversational-signal",
      },
      {
        input: "no se",
        expectedSkip: true,
        expectedKind: "conversational-signal",
      },
      {
        input: "dale",
        expectedSkip: true,
        expectedKind: "conversational-signal",
      },
      { input: "hola como estas hoy", expectedSkip: false, expectedKind: null },
      {
        input: "quiero hacer una reserva",
        expectedSkip: false,
        expectedKind: null,
      },
      { input: "que hora es", expectedSkip: false, expectedKind: null },
    ];

    it.each(testCases)(
      "should process correctly: $input",
      ({ input, expectedSkip, expectedKind }) => {
        const result = shouldSkipProcessing(input);
        expect(result.skip).toBe(expectedSkip);
        expect(result.kind).toBe(expectedKind as unknown as any);
      },
    );
  });

  describe("Edge cases", () => {
    it("should handle empty strings", () => {
      expect(shouldSkipProcessing("").skip).toBe(false);
    });

    it("should handle whitespace", () => {
      expect(shouldSkipProcessing("   ").skip).toBe(false);
    });

    it("should handle mixed case", () => {
      expect(socialProtocols.greeting.test("HOLA")).toBe(true);
      expect(socialProtocols.greeting.test("Hola")).toBe(true);
      expect(socialProtocols.greeting.test("hOlA")).toBe(true);
    });

    it("should handle punctuation", () => {
      expect(socialProtocols.greeting.test("hola!")).toBe(true);
      expect(socialProtocols.greeting.test("hola!!")).toBe(true);
      expect(socialProtocols.goodbye.test("chau!")).toBe(true);
      expect(socialProtocols.thanks.test("gracias!")).toBe(true);
    });
  });
});
