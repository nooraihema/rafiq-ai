// intelligence/linguistic_core/index.js
// Version 3.0: The Brain's Chief Conductor
// This file is the sole entry point to the linguistic core. It orchestrates
// the primary modules (tokenizer, summarizer) and passes their rich output,
// along with pluggable analyzers, to the Brain for final processing.

import { tokenize } from './tokenizer/index.js';
import { summarize } from './summarizer/index.js';
import { analyzeMood } from './summarizer/mood_analyzer.js'; // <-- 1. استيراد المحلل المتخصص
import { processMessage } from './brain/index.js';

/**
 * الدالة الرئيسية للمكتبة اللغوية (الواجهة العامة).
 * @param {string} userMessage 
 * @param {object} fingerprint
 * @param {string} userId
 * @param {object} userState - [تعديل] كائن حالة المستخدم الكامل
 * @returns {object|null} - كائن الرد النهائي، أو null في حالة الفشل.
 */
export function generateAdvancedReply(userMessage, fingerprint, userId, userState) {
    try {
        console.log("[Linguistic Core] ==> STAGE 1: Tokenizing...");
        const semanticMap = tokenize(userMessage);
        console.log("[Linguistic Core] Semantic Map created. Concepts:", semanticMap.list.allConcepts);

        console.log("[Linguistic Core] ==> STAGE 2: Summarizing...");
        // [تعديل] Summarizer الآن يستقبل userState الكامل
        const summary = summarize(semanticMap, fingerprint, userState);
        console.log("[Linguistic Core] Summary created:", { mood: summary.mood, tension: summary.narrativeTension?.name });

        console.log("[Linguistic Core] ==> STAGE 3: Invoking The Brain...");
        
        // [تعديل] تجهيز "المكونات الإضافية" التي سيستخدمها الدماغ
        const brainOptions = { 
            debug: true,
            // نحن نوصل "محلل المزاج" الذي بنيناه بـ "مقبس" الدماغ
            moodAnalyzer: (map, fp, state) => analyzeMood(map, fp, state) 
        };
        
        const brainResult = processMessage({
            semanticMap,
            summary,
            fingerprint,
            userId,
            options: brainOptions
        });
        
        console.log("[Linguistic Core] Brain processing complete.");

        if (!brainResult || !brainResult.reply) {
            console.error("[Linguistic Core] Brain did not produce a valid reply.");
            return null;
        }

        // نضيف حالة المستخدم المحدثة إلى المخرجات ليتم حفظها لاحقًا
        brainResult.updatedUserState = userState;
        
        return brainResult;

    } catch (error) {
        console.error("[Linguistic Core] FATAL ERROR:", error);
        return null;
    }
}
