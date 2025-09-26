// intelligence/linguistic_core/summarizer.js
import { tokenize } from './tokenizer.js';
import { createVector } from './vectorizer.js';

/**
 * يحلل مجموعة من الردود ورسالة المستخدم لاستخلاص "ملف الموقف".
 * @param {string} userMessage - رسالة المستخدم.
 * @param {object[]} candidates - مصفوفة الردود المرشحة.
 * @returns {object} - كائن يلخص الموقف.
 */
export function summarize(userMessage, candidates) {
  const userTokens = tokenize(userMessage).tokens.flat();
  const userVector = createVector(userTokens);

  // منطق بسيط حاليًا: إيجاد أكثر الكلمات تكرارًا
  let dominantConcept = "unknown";
  let maxCount = 0;
  for (const [token, count] of userVector.entries()) {
    if (count > maxCount) {
      maxCount = count;
      dominantConcept = token;
    }
  }

  // الواجهة جاهزة للمستقبل
  return {
    dominantConcept: dominantConcept,
    secondaryConcepts: [], // سيتم ملؤها لاحقًا
    narrativeTension: null, // سيتم ملؤها لاحقًا
    implicitNeed: "support", // سيتم تحديده لاحقًا
  };
}
