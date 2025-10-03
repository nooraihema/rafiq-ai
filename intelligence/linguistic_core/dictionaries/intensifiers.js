// intelligence/linguistic_core/dictionaries/intensifiers.js
// Version 1.0: Initial creation.
// This file contains a dictionary of words that modify the intensity of adjacent concepts.

/**
 * @typedef {Object} Intensifier
 * @property {number} multiplier - The factor by which to multiply the mood score of an adjacent concept.
 * @property {string} [description] - An internal description.
 */

/**
 * INTENSIFIERS: A map of words that amplify or diminish the emotional weight of other words.
 * The mood analyzer will use these to adjust the final mood score.
 * For example, "حزين جدًا" is more intense than just "حزين".
 * @type {Object.<string, Intensifier>}
 */
export const INTENSIFIERS = {
  // --- High Intensity Amplifiers (تضخيم عالي) ---
  "جدًا": { multiplier: 1.5, description: "Very" },
  "جدا": { multiplier: 1.5, description: "Very (alternative spelling)" },
  "أوي": { multiplier: 1.5, description: "Very (colloquial)" },
  "قوي": { multiplier: 1.5, description: "Very (colloquial, alternative spelling)" },
  "بشكل رهيب": { multiplier: 1.8, description: "Terribly" },
  "بشكل فظيع": { multiplier: 1.8, description: "Awfully" },
  "لدرجة لا تطاق": { multiplier: 2.0, description: "Unbearably" },
  "بجد": { multiplier: 1.4, description: "Really/Truly" },
  "فعلًا": { multiplier: 1.4, description: "Indeed/Really" },
  "حقيقي": { multiplier: 1.4, description: "Truly" },
  "خالص": { multiplier: 1.6, description: "Completely/At all (e.g., مش مبسوط خالص)" },
  "تمامًا": { multiplier: 1.7, description: "Completely" },
  "بالكامل": { multiplier: 1.7, description: "Entirely" },

  // --- Medium Intensity Amplifiers (تضخيم متوسط) ---
  "شوية": { multiplier: 1.2, description: "A bit" },
  "إلى حد ما": { multiplier: 1.2, description: "Somewhat" },
  "نوعًا ما": { multiplier: 1.2, description: "Kind of" },
  "زيادة": { multiplier: 1.3, description: "More/Extra" },

  // --- Diminishers (or context-dependent) (تخفيف الشدة) ---
  // Note: These are context-dependent and should be handled with care.
  // For now, we keep the list focused on amplifiers. A future version might add diminishers.
  // Example: "مش حزين أوي" -> "not" is the negator, "أوي" is the intensifier. The logic should handle this.
};

export default INTENSIFIERS;
