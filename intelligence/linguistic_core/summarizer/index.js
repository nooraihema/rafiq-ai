
// intelligence/linguistic_core/summarizer/index.js
import { tokenize } from '../tokenizer/index.js';      // <-- تم تصحيح المسار
import { createVector } from '../vectorizer/index.js';  // <-- تم تصحيح المسار
import { Dictionaries } from '../../dictionaries/index.js'; // <-- هذا المسار صحيح

/**
 * الوظيفة الرئيسية لوحدة Summarizer.
 * تحلل رسالة المستخدم لاستخلاص "ملف الموقف" المنظم.
 * @param {string} userMessage
 * @param {object[]} candidates
 * @returns {object} 
 */
export function summarize(userMessage, candidates) {
    const userTokens = tokenize(userMessage).tokens.flat();
    const userConcepts = userTokens.map(token => Dictionaries.CONCEPT_MAP[token] || token);
    const userVector = createVector(userConcepts);

    let dominantConcept = "unknown";
    let maxCount = 0;
    for (const [concept, count] of userVector.entries()) {
        if (count > maxCount) {
            maxCount = count;
            dominantConcept = concept;
        }
    }

    return {
        dominantConcept: dominantConcept,
        secondaryConcepts: [],
        narrativeTension: null,
        implicitNeed: "support",
    };
}
