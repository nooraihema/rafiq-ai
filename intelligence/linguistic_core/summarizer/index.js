// intelligence/linguistic_core/summarizer/index.js
// Version 4.0: The Master Orchestrator
// This version acts as a true orchestrator, passing the complete semantic map and
// user state to the specialized analyzers to leverage their full capabilities.

import { tokenize } from '../tokenizer/index.js';
import { analyzeMood } from './mood_analyzer.js';
import { detectTension } from './tension_detector.js';
// We will build this in the next step
// import { analyzeNeeds } from './needs_analyzer.js';

/**
 * الوظيفة الرئيسية لوحدة Summarizer.
 * يقوم بتنسيق عمل كل المحللات لإنتاج "ملف موقف نفسي" متكامل.
 * @param {string} userMessage
 *- * @param {object} fingerprint - بصمة الرسالة الكاملة.
 * @param {object} userState - [إضافة جديدة] كائن حالة المستخدم الكامل (يحتوي على lastMood, moodStreak, إلخ).
 * @returns {object} - "ملف الموقف" النهائي.
 */
export function summarize(userMessage, fingerprint = {}, userState = {}) {
    // 1. [الأساس] نحصل على الخريطة الدلالية الكاملة. هي مصدر الحقيقة لكل التحليلات التالية.
    const semanticMap = tokenize(userMessage);

    // 2. [التنسيق] نستدعي الخبراء المتخصصين ونمرر لهم كل ما يحتاجونه.
    
    // خبير المزاج يحتاج الخريطة الكاملة، البصمة، وحالة المستخدم.
    const moodAnalysis = analyzeMood(semanticMap, fingerprint, userState);

    // خبير التوتر يحتاج فقط قائمة المفاهيم.
    const narrativeTension = detectTension(semanticMap.list.allConcepts);
    
    // خبير الاحتياجات (سيتم بناؤه لاحقًا) سيحتاج البصمة.
    // const implicitNeed = analyzeNeeds(fingerprint);

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

        // الحاجة (سيتم تطويرها)
        implicitNeed: "support", // Placeholder for now
        
        // تمرير الخريطة الكاملة لمن يحتاجها لاحقًا (مثل الدماغ)
        _rawSemanticMap: semanticMap 
    };
}
