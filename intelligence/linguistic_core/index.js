// intelligence/linguistic_core/index.js
import { summarize } from './summarizer/index.js';      // <-- تم تصحيح المسار
import { generateReply } from './generator/index.js';       // <-- تم تصحيح المسار

/**
 * الدالة الرئيسية للمكتبة اللغوية (الواجهة العامة).
 * @param {string} userMessage 
 * @param {object[]} candidates 
 * @returns {object|null}
 */
export function generateAdvancedReply(userMessage, candidates) {
    try {
        console.log("[Linguistic Core] ==> STAGE 1: Summarizing...");
        const summary = summarize(userMessage, candidates);
        console.log("[Linguistic Core] Summary created:", summary);

        console.log("[Linguistic Core] ==> STAGE 2: Generating reply...");
        const replyText = generateReply(summary);
        console.log("[Linguistic Core] Generated reply text:", replyText);

        if (!replyText) {
            console.log("[Linguistic Core] Generation failed. Returning null.");
            return null;
        }

        return {
            reply: replyText,
            source: 'linguistic_core_v1',
            confidence: 0.95,
            metadata: {
                produced_by: 'generative_engine',
                summary: summary,
            }
        };
    } catch (error) {
        console.error("[Linguistic Core] FATAL ERROR:", error);
        return null;
    }
}
