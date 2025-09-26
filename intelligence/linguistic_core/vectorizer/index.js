// intelligence/linguistic_core/vectorizer/index.js

/**
 * الوظيفة الرئيسية لوحدة Vectorizer.
 * حاليًا تستخدم "حقيبة الكلمات" (Bag of Words) لحساب تكرار كل كلمة.
 * @param {string[]} tokens - مصفوفة من الكلمات النظيفة.
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

// [للمستقبل] يمكن إضافة دالة cosineSimilarity هنا لحساب التشابه.
