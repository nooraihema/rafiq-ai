// intelligence/linguistic_core/summarizer/index.js
// Version 3.0: Contextual Understanding
// This version integrates specialized analyzers for mood and narrative tension,
// creating a much richer and more nuanced summary of the user's situation.

import { tokenize } from '../tokenizer/index.js';
import { analyzeMood } from './mood_analyzer.js';
import { detectTension } from './tension_detector.js'; // <-- 1. استيراد الوحدة الجديدة

/**
 * الوظيفة الرئيسية لوحدة Summarizer (الإصدار المطور).
 * @param {string} userMessage
 * @param {object} fingerprint - بصمة الرسالة الكاملة.
 * @param {object[]} candidates - (غير مستخدم حاليًا، لكنه موجود للمستقبل).
 * @param {string} [lastMood='supportive'] - الحالة المزاجية من الرد السابق.
 * @returns {object} - "ملف الموقف" المطور والكامل.
 */
export function summarize(userMessage, fingerprint = {}, candidates = [], lastMood = 'supportive') {
    // 1. نحصل على الخريطة الدلالية الكاملة من tokenizer.
    const semanticMap = tokenize(userMessage);

    // 2. نستخرج البيانات اللازمة من الخريطة والبصمة.
    const conceptFrequencies = semanticMap.frequencies.concepts;
    const allConcepts = semanticMap.list.allConcepts;
    const primaryEmotion = fingerprint?.primaryEmotion?.type || null;

    // 3. [تطوير] استدعاء الوحدات المتخصصة.
    const moodAnalysis = analyzeMood(conceptFrequencies, primaryEmotion, lastMood);
    const narrativeTension = detectTension(allConcepts); // <-- 2. استخدام الوحدة الجديدة

    // 4. ترتيب المفاهيم حسب الأهمية (منطق إحصائي بسيط حاليًا).
    const sortedConcepts = Object.entries(conceptFrequencies)
        .sort(([, a], [, b]) => b - a)
        .map(([concept]) => concept);

    // 5. بناء "ملف الموقف" النهائي والكامل.
    return {
        allConcepts: sortedConcepts,
        dominantConcept: sortedConcepts[0] || null,
        secondaryConcepts: sortedConcepts.slice(1),
        mood: moodAnalysis.mood,
        moodConfidence: moodAnalysis.confidence,
        moodIntensity: moodAnalysis.intensity,
        moodDistribution: moodAnalysis.distribution,
        narrativeTension: narrativeTension, // <-- 3. إضافة نتيجة تحليل التوتر
        implicitNeed: "support", // سيتم تطويره في المرحلة التالية
    };
}
