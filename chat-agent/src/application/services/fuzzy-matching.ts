/**
 * Calculates the Levenshtein distance between two strings.
 * This is the minimum number of single-character edits (insertions, deletions, substitutions)
 * required to change one word into the other.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculates similarity ratio between two strings (0 to 1).
 * 1 means identical, 0 means completely different.
 */
function similarityRatio(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}

/**
 * Normalizes a string for comparison:
 * - Converts to lowercase
 * - Removes extra whitespace
 * - Removes special characters (accents, punctuation)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export interface FuzzyMatchOptions {
  /**
   * Minimum similarity threshold (0 to 1).
   * Default: 0.6
   */
  threshold?: number;
  /**
   * If true, compares word by word and returns true if any word matches.
   * If false, compares the entire strings.
   * Default: false
   */
  wordByWord?: boolean;
}

/**
 * Compares two strings for fuzzy similarity.
 * Returns true if they are similar enough based on the threshold.
 *
 * @param input1 - First string to compare
 * @param input2 - Second string to compare
 * @param options - Optional configuration
 * @returns true if strings are similar, false otherwise
 *
 * @example
 * fuzzyMatch("carbonara", "pizza carbonara") // true
 * fuzzyMatch("pizza de carne", "pizza de carne") // true
 * fuzzyMatch("hamburguesa", "pasta") // false
 */
export function fuzzyMatch(
  input1: string,
  input2: string,
  options: FuzzyMatchOptions = {},
): boolean {
  const { threshold = 0.65, wordByWord = false } = options;

  const normalized1 = normalizeText(input1);
  const normalized2 = normalizeText(input2);

  // Handle empty strings
  if (normalized1.length === 0 && normalized2.length === 0) return true;
  if (normalized1.length === 0 || normalized2.length === 0) return false;

  if (normalized1 === normalized2) return true;

  if (wordByWord) {
    const words1 = normalized1.split(" ");
    const words2 = normalized2.split(" ");

    // Check if any word from input1 matches any word from input2
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (similarityRatio(word1, word2) >= threshold) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if one string contains the other (for partial matches)
  // Only allow if the shorter string is at least 40% of the longer one
  // This prevents "ca" from matching "pizza carbonara"
  const minRatio = 0.4;
  const len1 = normalized1.length;
  const len2 = normalized2.length;
  const lengthRatio = Math.min(len1, len2) / Math.max(len1, len2);

  if (lengthRatio >= minRatio) {
    if (
      normalized1.includes(normalized2) ||
      normalized2.includes(normalized1)
    ) {
      return true;
    }
  }

  // Compare full strings
  const ratio = similarityRatio(normalized1, normalized2);
  return ratio >= threshold;
}
