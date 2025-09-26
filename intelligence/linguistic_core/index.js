// intelligence/linguistic_core/index.js
import { summarize } from './summarizer.js';
import { generateReply } from './generator.js';

/**
 * الدالة الرئيسية للمكتبة اللغوية.
 * تستقبل كل المدخلات الخام وتنفذ خط التجميع كاملاً لتوليد رد متقدم.
 * @param {string} userMessage 
 * @param {object[]} candidates 
 * @returns {object|null} - كائن الرد النهائي، أو null في حالة الفشل.
 */
export function generateAdvancedReply(userMessage, candidates) {
  try {
    // 1. التلخيص واستخلاص المعاني
    const summary = summarize(userMessage, candidates);

    // 2. التوليد
    const replyText = generateReply(summary);

    if (!replyText) return null;

    // 3. إعادة كائن رد متوافق مع النظام
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
    console.error("Error in linguistic_core:", error);
    return null;
  }
}
