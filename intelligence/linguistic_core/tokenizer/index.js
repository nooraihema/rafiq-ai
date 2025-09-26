// intelligence/linguistic_core/tokenizer/index.js
import { Dictionaries } from '../../dictionaries/index.js';
import { safeStr } from '../../utils.js';

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

    // 1. تقسيم النص إلى جمل
    const sentences = safeStr(text).split(/(?<=[.؟!?])\s+/);

    // 2. تقسيم كل جملة إلى كلمات، تنظيفها، وإزالة الكلمات الشائعة
    const tokens = sentences.map(sentence => 
        sentence.split(/\s+/)
            .map(cleanToken)
            .filter(token => token && !Dictionaries.STOP_WORDS.includes(token))
    );

    return { sentences, tokens };
}
