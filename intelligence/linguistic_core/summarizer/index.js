// intelligence/linguistic_core/summarizer/index.js
import { tokenize } from '../tokenizer/index.js';
import { createVector } from '../vectorizer/index.js';
import { Dictionaries } from '../../dictionaries/index.js';

/**
 * الوظيفة الرئيسية لوحدة Summarizer.
 * تحلل رسالة المستخدم لاستخلاص "ملف الموقف" المنظم.
 * @param {string} userMessage
 * @param {object[]} candidates
 * @returns {object} 
 */
export function summarize(userMessage, candidates) {
    // 1. تحليل رسالة المستخدم
    const userTokens = tokenize(userMessage).tokens.flat();

    // 2. تحويل الكلمات إلى مفاهيم أساسية باستخدام قاموس المفاهيم
    const userConcepts = userTokens.map(token => Dictionaries.CONCEPT_MAP[token] || token);
    const userVector = createVector(userConcepts);

    // 3. إيجاد المفهوم المهيمن (الأكثر تكرارًا)
    let dominantConcept = "unknown";
    let maxCount = 0;
    for (const [concept, count] of userVector.entries()) {
        if (count > maxCount) {
            maxCount = count;
            dominantConcept = concept;
        }
    }

    // 4. بناء "ملف الموقف" (جاهز للتوسع مستقبلاً)
    return {
        dominantConcept: dominantConcept,
        secondaryConcepts: [],
        narrativeTension: null,
        implicitNeed: "support", // يمكن تحليله لاحقًا من بصمة الرسالة
    };
}
