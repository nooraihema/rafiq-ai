// intelligence/linguistic_core/summarizer/needs_analyzer.js
// Version 1.0: Implicit Need Analysis Engine
// This engine analyzes multiple signals from the user's message to infer
// their core psychological need in the current conversational turn.

import { Dictionaries } from '../../dictionaries/index.js';
import { safeStr } from '../../utils.js';

/**
 * يحلل بصمة الرسالة والخريطة الدلالية لاستنتاج الحاجة النفسية الأساسية للمستخدم.
 * @param {object} fingerprint - بصمة الرسالة الكاملة.
 * @param {object} semanticMap - الخريطة الدلالية الكاملة من tokenizer.
 * @returns {string} - الحاجة المستنتجة (e.g., 'validation', 'guidance', 'clarity').
 */
export function analyzeNeeds(fingerprint = {}, semanticMap = {}) {
    // 1. تعريف "عدادات النقاط" لكل حاجة محتملة.
    const needScores = {
        validation: 0.0, // الحاجة للشعور بالتحقق والفهم (أنا شايفك وسامعك)
        guidance: 0.0,   // الحاجة للإرشاد وخطوات عملية (قولي أعمل إيه)
        clarity: 0.0,    // الحاجة لتوضيح الأفكار وفهم الذات (ساعدني أفهم نفسي)
        support: 0.5,    // الحاجة للدعم العام (كن بجانبي) - نقطة بداية
    };

    const { communicationStyle, intensity, originalMessage } = fingerprint;
    const { allConcepts } = semanticMap.list;

    // 2. التحليل بناءً على أسلوب التواصل (أقوى مؤشر).
    if (communicationStyle === 'venting') {
        needScores.validation += 1.5;
        needScores.support += 1.0;
    } else if (communicationStyle === 'seeking_advice' || originalMessage.includes('?')) {
        needScores.guidance += 1.5;
        needScores.clarity += 0.5;
    } else if (communicationStyle === 'story_telling') {
        needScores.clarity += 1.0;
        needScores.validation += 0.5;
    }

    // 3. التحليل بناءً على نوع المفاهيم المكتشفة.
    if (allConcepts && allConcepts.length > 0) {
        let feelingCount = 0;
        let actionCount = 0;

        for (const concept of allConcepts) {
            const conceptData = Dictionaries.CONCEPT_DEFINITIONS[concept];
            if (conceptData?.tags) {
                if (conceptData.tags.includes('feeling')) feelingCount++;
                if (conceptData.tags.includes('action') || conceptData.tags.includes('problem-solving')) actionCount++;
            }
        }
        
        // إذا كان معظم الكلام عن المشاعر، فالحاجة هي التحقق
        if (feelingCount > actionCount) {
            needScores.validation += 1.0 * (feelingCount / allConcepts.length);
        }
        // إذا كان الكلام يميل نحو الأفعال والمشاكل، فالحاجة هي الإرشاد
        if (actionCount > feelingCount) {
            needScores.guidance += 1.0 * (actionCount / allConcepts.length);
        }
    }
    
    // 4. التحليل بناءً على شدة المشاعر.
    if (intensity && intensity > 0.8) {
        // المشاعر القوية جدًا تحتاج إلى دعم وتحقق قبل أي شيء آخر
        needScores.support += 1.0;
        needScores.validation += 0.8;
    }

    // 5. اختيار الحاجة الفائزة (صاحبة أعلى مجموع نقاط).
    let dominantNeed = 'support';
    let maxScore = -1;

    for (const need in needScores) {
        if (needScores[need] > maxScore) {
            maxScore = needScores[need];
            dominantNeed = need;
        }
    }
    
    console.log("[NeedsAnalyzer] Final Scores:", needScores);
    return dominantNeed;
}
