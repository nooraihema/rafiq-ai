// intelligence/linguistic_core/summarizer/index.js
// Version 5.0: The Complete Psychometric Orchestrator
// This final version orchestrates all specialized analyzers (mood, tension, needs)
// to produce a comprehensive, multi-layered summary of the user's psychological state.

import { tokenize } from '../tokenizer/index.js';
import { analyzeMood } from './mood_analyzer.js';
import { detectTension } from './tension_detector.js';
import { analyzeNeeds } from './needs_analyzer.js'; // <-- 1. استيراد الوحدة الجديدة

/**
 * الوظيفة الرئيسية لوحدة Summarizer.
 * يقوم بتنسيق عمل كل المحللات لإنتاج "ملف موقف نفسي" متكامل.
 * @param {string} userMessage
 * - * @param {object} fingerprint - بصمة الرسالة الكاملة.
 * @param {object} userState - كائن حالة المستخدم الكامل (يحتوي على lastMood, moodStreak, إلخ).
 * @returns {object} - "ملف الموقف" النهائي.
 */
export function summarize(userMessage, fingerprint = {}, userState = {}) {
    // 1. [الأساس] نحصل على الخريطة الدلالية الكاملة. هي مصدر الحقيقة لكل التحليلات التالية.
    const semanticMap = tokenize(userMessage);

    // 2. [التنسيق] نستدعي الخبراء المتخصصين ونمرر لهم كل ما يحتاجونه.
    
    // خبير المزاج يحتاج الخريطة، البصمة، وحالة المستخدم.
    const moodAnalysis = analyzeMood(semanticMap, fingerprint, userState);

    // خبير التوتر يحتاج قائمة المفاهيم.
    const narrativeTension = detectTension(semanticMap.list.allConcepts);
    
    // [جديد] خبير الاحتياجات يحتاج البصمة والخريطة.
    const implicitNeed = analyzeNeeds(fingerprint, semanticMap); // <-- 2. استخدام الوحدة الجديدة

    // 3. [التجميع] نقوم ببناء ملف الموقف النهائي من نتائج الخبراء.
    const allConcepts = semanticMap.list.allConcepts;

    return {
        // معلومات المفاهيم مباشرة من tokenizer
        allConcepts: allConcepts,
        dominantConcept: allConcepts[0] || null,
        secondaryConcepts: allConcepts.slice(1),
        
        // معلومات المزاج مباشرة من mood_analyzer
        mood: moodAnalysis.mood,
        moodConfidence: moodAnalysis.confidence,
        moodIntensity: moodAnalysis.intensity,
        moodDistribution: moodAnalysis.distribution,
        isComposite: moodAnalysis.isComposite,

        // معلومات الصراع مباشرة من tension_detector
        narrativeTension: narrativeTension,

        // الحاجة الضمنية مباشرة من needs_analyzer
        implicitNeed: implicitNeed, // <-- 3. إضافة نتيجة تحليل الاحتياجات
        
        // تمرير الخريطة الكاملة لمن يحتاجها لاحقًا (مثل الدماغ)
        _rawSemanticMap: semanticMap 
    };
}
