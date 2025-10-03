// intelligence/linguistic_core/dictionaries/anchors.js
// Version 1.0: Initial creation.
// This file contains a dictionary of "anchor" words that have strong, standalone mood implications.

/**
 * @typedef {Object} AnchorMood
 * @property {Object.<string, number>} mood_weights - The direct mood scores this word contributes.
 * @property {string} [description] - An internal description.
 */

/**
 * ANCHOR_MOODS: A map of words with inherent, powerful emotional polarity.
 * These are used by the mood analyzer to fine-tune the mood score, especially when
 * a sentence lacks clear concepts but has a strong emotional tone.
 * @type {Object.<string, AnchorMood>}
 */
export const ANCHOR_MOODS = {
  // --- Strong Positive Anchors (مراسي إيجابية قوية) ---
  "رائع": { mood_weights: { empowering: 1.5 }, description: "Wonderful/Great" },
  "ممتاز": { mood_weights: { empowering: 1.4 }, description: "Excellent" },
  "جميل": { mood_weights: { empowering: 1.2, supportive: 0.5 }, description: "Beautiful" },
  "سعيد": { mood_weights: { empowering: 1.8 }, description: "Happy" },
  "مبسوط": { mood_weights: { empowering: 1.8 }, description: "Happy (colloquial)" },
  "فرحان": { mood_weights: { empowering: 1.8 }, description: "Joyful" },
  "متحمس": { mood_weights: { empowering: 1.6 }, description: "Excited" },
  "ممتن": { mood_weights: { supportive: 1.5, empowering: 0.5 }, description: "Grateful" },
  "فخور": { mood_weights: { empowering: 1.7 }, description: "Proud" },

  // --- Strong Negative Anchors (مراسي سلبية قوية) ---
  "مأساة": { mood_weights: { supportive: 2.0 }, description: "Tragedy" },
  "كارثة": { mood_weights: { supportive: 1.8, calming: 1.0 }, description: "Disaster" },
  "كابوس": { mood_weights: { supportive: 1.7, calming: 0.8 }, description: "Nightmare" },
  "فظيع": { mood_weights: { supportive: 1.6 }, description: "Awful/Terrible" },
  "سيء": { mood_weights: { supportive: 1.2 }, description: "Bad" },
  "محطم": { mood_weights: { supportive: 2.2 }, description: "Broken/Shattered" },
  "منهار": { mood_weights: { supportive: 2.5, calming: 1.0 }, description: "Collapsed/Breaking down" },
  "يائس": { mood_weights: { supportive: 1.8 }, description: "Hopeless/Desperate" },

  // --- Calming/Supportive Anchors ---
  "سلام": { mood_weights: { calming: 1.5, supportive: 0.5 }, description: "Peace" },
  "أمان": { mood_weights: { calming: 1.8, supportive: 0.8 }, description: "Safety/Security" },
  "راحة": { mood_weights: { calming: 1.6, supportive: 0.6 }, description: "Comfort/Relief" },
  "هدوء": { mood_weights: { calming: 1.7 }, description: "Calmness" },
};

export default ANCHOR_MOODS;
