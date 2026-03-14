import { ProductItem } from "@/domain/orders";
import { Product } from "@/infraestructure/adapters/cms";
import { QuadrantPoint } from "@/infraestructure/adapters/vector-store";

/**
 * Normalizes text for comparison: lowercase, trim, standardize separators
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[-_']/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/**
 * Finds a matching product using fuzzy string matching.
 * Handles cases like: "carbonara" ↔ "pizza carbonara", "coca cola" ↔ "coca-cola"
 *
 * @param searchedProducts - List of products to search in
 * @param productName - Product name from user input
 * @param threshold - Minimum similarity score (0-1). Default 0.7 balances precision/recall
 * @returns The matching product or null if no match found
 */
export function findMatchingProduct(
  searchedProducts: QuadrantPoint<Partial<Product>>[],
  productName: string,
  threshold: number = 0.7,
): QuadrantPoint<Partial<Product>> | null {
  const normalizedInput = normalizeText(productName);
  const inputWords = new Set(normalizedInput.split(" "));

  for (const product of searchedProducts) {
    if (!product.payload.name) continue;

    const normalizedName = normalizeText(product.payload.name);
    const nameWords = new Set(normalizedName.split(" "));

    // Exact or normalized match
    if (normalizedInput === normalizedName) {
      return product;
    }

    // One contains the other (handles "carbonara" vs "pizza carbonara")
    if (
      normalizedInput.includes(normalizedName) ||
      normalizedName.includes(normalizedInput)
    ) {
      return product;
    }

    // Word overlap: at least 50% of words must match
    const intersection = [...inputWords].filter((w) => nameWords.has(w));
    const minWords = Math.min(inputWords.size, nameWords.size);
    const overlapRatio = minWords > 0 ? intersection.length / minWords : 0;

    if (overlapRatio >= threshold) {
      return product;
    }
  }

  return null;
}

/**
 * Finds a matching product in cart using fuzzy string matching
 */
export function findMatchingProductInCart(
  products: ProductItem[],
  productName: string,
  threshold: number = 0.7,
): { index: number; product: ProductItem } | null {
  const normalizedInput = normalizeText(productName);
  const inputWords = new Set(normalizedInput.split(" "));

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const normalizedName = normalizeText(product.name);
    const nameWords = new Set(normalizedName.split(" "));

    if (normalizedInput === normalizedName) {
      return { index: i, product };
    }

    if (
      normalizedInput.includes(normalizedName) ||
      normalizedName.includes(normalizedInput)
    ) {
      return { index: i, product };
    }

    const intersection = [...inputWords].filter((w) => nameWords.has(w));
    const minWords = Math.min(inputWords.size, nameWords.size);
    const overlapRatio = minWords > 0 ? intersection.length / minWords : 0;

    if (overlapRatio >= threshold) {
      return { index: i, product };
    }
  }

  return null;
}
