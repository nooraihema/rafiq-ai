// intelligence/linguistic_core/tokenizer/index.js
import { Dictionaries } from '../dictionaries/index.js'; // <-- تصحيح المسار
import { safeStr } from '../utils.js';

/**
 * ينظف الكلمة من أي رموز غير الحروف والأرقام.
 * @param {string} token 
 * @returns {string}
 */
function cleanToken(token) {
    return safeStr(token).toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, "");
}

/**
 * الوظيفة الرئيسية لوحدة Tokenizer.
 * @param {string} text - النص المراد تحليله.
 * @returns {{sentences: string[], tokens: string[][]}}
 */
export function tokenize(text) {
    if (!text) return { sentences: [], tokens: [] };

    const sentences = safeStr(text).split(/(?<=[.؟!?])\s+/);
    const tokens = sentences.map(sentence => 
        sentence.split(/\s+/)
            .map(cleanToken)
            .filter(token => token && !Dictionaries.STOP_WORDS.includes(token))
    );

    return { sentences, tokens };
}
