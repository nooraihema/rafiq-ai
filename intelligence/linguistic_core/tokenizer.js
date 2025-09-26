// intelligence/linguistic_core/tokenizer.js
import { STOP_WORDS } from './dictionaries.js';

/**
 * يحلل النص إلى جمل وكلمات مع إزالة الكلمات الشائعة.
 * @param {string} text - النص المراد تحليله.
 * @returns {{sentences: string[], tokens: string[][]}} - كائن يحتوي على الجمل والكلمات المقابلة لكل جملة.
 */
export function tokenize(text) {
  if (!text) return { sentences: [], tokens: [] };

  const sentences = text.split(/(?<=[.؟!?])\s+/);
  const tokens = sentences.map(sentence => 
    sentence.toLowerCase()
      .split(/\s+/)
      .map(t => t.replace(/[^\p{L}\p{N}_]+/gu, ""))
      .filter(t => t && !STOP_WORDS.includes(t))
  );

  return { sentences, tokens };
}
