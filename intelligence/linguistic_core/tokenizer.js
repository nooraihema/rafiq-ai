// intelligence/linguistic_core/tokenizer.js
import { STOP_WORDS } from './dictionaries.js';
import { tokenizeClean } from './utils.js'; // استيراد الدالة الجديدة

/**
 * يحلل النص إلى جمل وكلمات مع إزالة الكلمات الشائعة.
 * @param {string} text - النص المراد تحليله.
 * @returns {{sentences: string[], tokens: string[][]}} - كائن يحتوي على الجمل والكلمات المقابلة لكل جملة.
 */
export function tokenize(text) {
  if (!text) return { sentences: [], tokens: [] };

  const sentences = text.split(/(?<=[.؟!?])\s+/);
  const tokens = sentences.map(sentence => 
    tokenizeClean(sentence).filter(token => token && !STOP_WORDS.includes(token))
  );

  return { sentences, tokens };
}
