import { describe, it, expect } from "bun:test";
import {
  fuzzyMatch,
  FuzzyMatchOptions,
} from "@/application/services/fuzzy-matching";

describe("fuzzyMatch", () => {
  describe("exact matches", () => {
    it("should return true for identical strings", () => {
      expect(fuzzyMatch("pizza carbonara", "pizza carbonara")).toBe(true);
    });

    it("should return true for identical strings with different casing", () => {
      expect(fuzzyMatch("Pizza Carbonara", "pizza carbonara")).toBe(true);
      expect(fuzzyMatch("PIZZA CARBONARA", "pizza carbonara")).toBe(true);
      expect(fuzzyMatch("PIZZ CARBONRA", "pizza carbonara")).toBe(true);
      expect(fuzzyMatch("CARBONaRA", "pizza carbonara")).toBe(true);
      expect(fuzzyMatch("CARBo", "pizza carbonara")).toBe(false);
      expect(fuzzyMatch("CARBonara", "pizza carbonara")).toBe(true);
    });

    it("should return true for strings with extra whitespace", () => {
      expect(fuzzyMatch("  pizza   carbonara  ", "pizza carbonara")).toBe(true);
    });
  });

  describe("partial matches (contains)", () => {
    it("should return true when input1 contains input2", () => {
      expect(fuzzyMatch("pizza carbonara", "carbonara")).toBe(true);
    });

    it("should return true when input2 contains input1", () => {
      expect(fuzzyMatch("carbonara", "pizza carbonara")).toBe(true);
    });

    it("should return true for product name variations", () => {
      expect(fuzzyMatch("pizza de carne", "pizza carne")).toBe(true);
      expect(fuzzyMatch("hamburguesa de pollo", "hamburguesa")).toBe(true);
    });
  });

  describe("fuzzy matches (similarity)", () => {
    it("should match strings with minor typos", () => {
      expect(fuzzyMatch("carbonara", "carbnara")).toBe(true);
      expect(fuzzyMatch("carbonara", "carbonra")).toBe(true);
    });

    it("should match strings with missing characters", () => {
      expect(fuzzyMatch("hamburguesa", "hamburgues")).toBe(true);
    });

    it("should match strings with extra characters", () => {
      expect(fuzzyMatch("pizza", "pizzaa")).toBe(true);
    });
  });

  describe("word-by-word matching", () => {
    it("should return true when any word matches", () => {
      const options: FuzzyMatchOptions = { wordByWord: true };
      expect(fuzzyMatch("pizza carbonara", "carbonara pasta", options)).toBe(
        true,
      );
    });

    it("should return false when no words match", () => {
      const options: FuzzyMatchOptions = { wordByWord: true };
      expect(fuzzyMatch("pizza", "pasta salad", options)).toBe(false);
    });

    it("should match words with typos in word-by-word mode", () => {
      const options: FuzzyMatchOptions = { wordByWord: true };
      expect(fuzzyMatch("pizza carbonara", "piza carbnara", options)).toBe(
        true,
      );
    });
  });

  describe("non-matches", () => {
    it("should return false for completely different strings", () => {
      expect(fuzzyMatch("pizza", "sopa")).toBe(false);
      expect(fuzzyMatch("hamburguesa", "ensalada")).toBe(false);
    });

    it("should return false for strings with low similarity", () => {
      expect(fuzzyMatch("abc", "xyz")).toBe(false);
    });

    it("should return false when shorter string is too short compared to longer", () => {
      expect(fuzzyMatch("CA", "pizza carbonara")).toBe(false);
      expect(fuzzyMatch("ca", "pizza carbonara")).toBe(false);
      expect(fuzzyMatch("a", "pizza")).toBe(false);
    });
  });

  describe("custom threshold", () => {
    it("should use custom threshold for stricter matching", () => {
      const options: FuzzyMatchOptions = { threshold: 0.9 };
      expect(fuzzyMatch("pizza", "piza", options)).toBe(false);
    });

    it("should use custom threshold for looser matching", () => {
      const options: FuzzyMatchOptions = { threshold: 0.4 };
      expect(fuzzyMatch("pizza", "pasta", options)).toBe(true);
    });
  });

  describe("special characters and accents", () => {
    it("should handle accented characters", () => {
      expect(fuzzyMatch("café", "cafe")).toBe(true);
      expect(fuzzyMatch("menú", "menu")).toBe(true);
    });

    it("should handle special punctuation", () => {
      expect(fuzzyMatch("pizza!", "pizza")).toBe(true);
      expect(fuzzyMatch("pizza?", "pizza")).toBe(true);
      expect(fuzzyMatch("pizza, pasta", "pizza pasta")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty strings", () => {
      expect(fuzzyMatch("", "")).toBe(true);
      expect(fuzzyMatch("pizza", "")).toBe(false);
      expect(fuzzyMatch("", "pizza")).toBe(false);
    });

    it("should handle single character strings", () => {
      expect(fuzzyMatch("a", "a")).toBe(true);
      expect(fuzzyMatch("a", "b")).toBe(false);
    });

    it("should handle very long strings", () => {
      const long1 = "pizza carbonara con jamón y queso parmesano";
      const long2 = "pizza carbonara con jamon y queso parmesano";
      expect(fuzzyMatch(long1, long2)).toBe(true);
    });
  });

  describe("real-world product matching scenarios", () => {
    it("should match common food order variations", () => {
      expect(fuzzyMatch("carbonara", "pizza carbonara")).toBe(true);
      expect(fuzzyMatch("pizza de carne", "pizza de carne")).toBe(true);
      expect(fuzzyMatch("hamburguesa", "hamburguesa de carne")).toBe(true);
      // For very different names like pasta vs fettuccine, use wordByWord mode
      expect(
        fuzzyMatch("pasta alfredo", "fettuccine alfredo", { wordByWord: true }),
      ).toBe(true);
    });

    it("should match menu items with slight variations", () => {
      expect(fuzzyMatch("ensalada cesar", "ensalada césar")).toBe(true);
      expect(fuzzyMatch("tacos al pastor", "taco al pastor")).toBe(true);
    });
  });
});
