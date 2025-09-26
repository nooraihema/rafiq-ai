// intelligence/linguistic_core/utils.js

/**
 * يختار عنصرًا عشوائيًا من مصفوفة.
 * @param {Array<T>} arr - المصفوفة للاختيار منها.
 * @returns {T|null} عنصر عشوائي أو null إذا كانت المصفوفة فارغة.
 */
export function sample(arr) { 
    if (!arr || arr.length === 0) return null; 
    return arr[Math.floor(Math.random() * arr.length)]; 
}

/**
 * يحول أي قيمة إلى سلسلة نصية آمنة (string).
 * @param {*} s - القيمة المراد تحويلها.
 * @returns {string} سلسلة نصية فارغة في حالة null/undefined.
 */
export function safeStr(s) { 
    return (s === null || s === undefined) ? "" : String(s); 
}
