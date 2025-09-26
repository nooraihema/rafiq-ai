// intelligence/linguistic_core/summarizer/tension_detector.js
// Version 1.0: Narrative Tension Detection Engine
// This module analyzes detected concepts to identify common psychological conflicts,
// adding a deeper layer of contextual understanding to the summary.

import { Dictionaries } from '../dictionaries/index.js';

/**
 * يحلل قائمة المفاهيم للبحث عن صراعات نفسية (توترات سردية).
 * @param {string[]} detectedConcepts - قائمة فريدة بكل المفاهيم المكتشفة في الرسالة.
 * @returns {object|null} - كائن يصف التوتر المكتشف، أو null إذا لم يتم العثور على أي توتر.
 */
export function detectTension(detectedConcepts) {
    if (!detectedConcepts || detectedConcepts.length < 2) {
        return null; // لا يمكن أن يكون هناك توتر بأقل من مفهومين
    }

    const conceptSet = new Set(detectedConcepts);

    // المرور على كل قواعد التوتر السردي في قاموسنا
    for (const tensionRule of Dictionaries.NARRATIVE_TENSIONS) {
        const requiredConcepts = new Set(tensionRule.concepts);
        
        // التحقق مما إذا كانت كل المفاهيم المطلوبة للتوتر موجودة في رسالة المستخدم
        const intersection = new Set([...requiredConcepts].filter(concept => conceptSet.has(concept)));

        if (intersection.size === requiredConcepts.size) {
            // وجدنا توترًا!
            return {
                name: tensionRule.tension_name,
                description: tensionRule.description,
                conflictingConcepts: tensionRule.concepts
            };
        }
    }

    // لم يتم العثور على أي توتر
    return null;
}
