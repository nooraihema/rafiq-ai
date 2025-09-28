// intelligence/linguistic_core/index.js
// Version 2.0: The Central Conductor for the Linguistic Core
// This file orchestrates the entire process from tokenization to final response generation
// by invoking the specialized modules (tokenizer, summarizer, brain) in the correct sequence.

import { tokenize } from './tokenizer/index.js';
import { summarize } from './summarizer/index.js';
import { processMessage } from './brain/index.js';

/**
 * الدالة الرئيسية للمكتبة اللغوية (الواجهة العامة).
 * @param {string} userMessage 
 * @param {object} fingerprint
 * @param {string} userId
 * @param {string} lastMood
 * @param {number} moodStreak
 * @returns {object|null} - كائن الرد النهائي، أو null في حالة الفشل.
 */
export function generateAdvancedReply(userMessage, fingerprint, userId, lastMood, moodStreak) {
    try {
        console.log("[Linguistic Core] ==> STAGE 1: Tokenizing & Semantic Mapping...");
        const semanticMap = tokenize(userMessage);
        console.log("[Linguistic Core] Semantic Map created. Concepts:", semanticMap.list.allConcepts);

        console.log("[Linguistic Core] ==> STAGE 2: Summarizing situation...");
        // Summarizer now needs the full semantic map
        const summary = summarize(semanticMap, fingerprint, [], lastMood, moodStreak);
        console.log("[Linguistic Core] Summary created:", { mood: summary.mood, tension: summary.narrativeTension?.name });

        console.log("[Linguistic Core] ==> STAGE 3: Invoking The Brain...");
        // The brain now receives the pre-processed summary and semantic map
        const brainResult = processMessage({
            semanticMap,
            summary, // Pass the rich summary object
            fingerprint,
            userId,
            // We pass the specialized analyzers as options to the brain
            options: { 
                debug: true 
            }
        });
        
        console.log("[Linguistic Core] Brain processing complete.");

        if (!brainResult || !brainResult.reply) {
            console.error("[Linguistic Core] Brain did not produce a valid reply.");
            return null;
        }

        return brainResult; // The brain's output is now the final output

    } catch (error) {
        console.error("[Linguistic Core] FATAL ERROR:", error);
        return null;
    }
}
