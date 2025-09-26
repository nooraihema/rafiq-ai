// intelligence/linguistic_core/vectorizer.js

/**
 * يحول مصفوفة من الكلمات إلى تمثيل رقمي (Vector).
 * @param {string[]} tokens - مصفوفة الكلمات.
 * @returns {Map<string, number>} - خريطة تمثل الـ Vector (كلمة => تكرار).
 */
export function createVector(tokens) {
  const vector = new Map();
  if (!tokens) return vector;

  for (const token of tokens) {
    vector.set(token, (vector.get(token) || 0) + 1);
  }
  return vector;
}

/**
 * [للمستقبل] يحسب التشابه بين متجهين.
 * @param {Map<string, number>} vec1 
 * @param {Map<string, number>} vec2 
 * @returns {number} - درجة التشابه (بين 0 و 1).
 */
export function cosineSimilarity(vec1, vec2) {
  // سيتم تنفيذ هذا لاحقًا باستخدام منطق رياضي صحيح
  return 0.0; 
}
