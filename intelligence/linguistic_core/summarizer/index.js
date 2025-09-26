// intelligence/linguistic_core/summarizer/index.js
// Version 3.1: Corrected Data Handling
// This version fixes the mismatch in data structure expected from the tokenizer,
// ensuring it correctly reads from the rich semanticMap object.

import { tokenize } from '../tokenizer/index.js';
import { analyzeMood } from './mood_analyzer.js';
import { detectTension } from './tension_detector.js';

/**
 * الوظيفة الرئيسية لوحدة Summarizer (الإصدار المصحح).
 * @param {string} userMessage
 * @param {object} fingerprint - بصمة الرسالة الكاملة.
 * @param {object[]} candidates
 * @param {string} [lastMood='supportive'] - الحالة المزاجية من الرد السابق.
 * @returns {object} - "ملف الموقف" المطور والكامل.
 */
export function summarize(userMessage, fingerprint = {}, candidates = [], lastMood = 'supportive') {
    // 1. نحصل على الخريطة الدلالية الكاملة من tokenizer.
    const semanticMap = tokenize(userMessage);

    // 2. [تصحيح] نستخرج البيانات من الأماكن الصحيحة في الخريطة الدلالية.
    const conceptFrequencies = semanticMap.frequencies.concepts; // هذا هو كائن التكرارات
    const allConcepts = semanticMap.list.allConcepts; // هذه هي قائمة المفاهيم
    const primaryEmotion = fingerprint?.primaryEmotion?.type || null;

    // 3. استدعاء الوحدات المتخصصة بالبيانات الصحيحة.
    const moodAnalysis = analyzeMood(conceptFrequencies, fingerprint, lastMood);
    const narrativeTension = detectTension(allConcepts);

    // 4. ترتيب المفاهيم (هذا الجزء لم يعد ضروريًا لأن tokenizer يقوم به، ولكن سنبقيه للوضوح).
    const sortedConcepts = allConcepts; // القائمة تأتي مرتبة ضمنيًا من tokenizer

    // 5. بناء "ملف الموقف" النهائي والكامل.
    return {
        allConcepts: sortedConcepts,
        dominantConcept: sortedConcepts[0] || null,
        secondaryConcepts: sortedConcepts.slice(1),
        mood: moodAnalysis.mood,
        moodConfidence: moodAnalysis.confidence,
        moodIntensity: moodAnalysis.intensity,
        moodDistribution: moodAnalysis.distribution,
        narrativeTension: narrativeTension,
        implicitNeed: "support",
    };
}
