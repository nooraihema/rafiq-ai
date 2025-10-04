// analysis_engine/dictionaries/anchors.js
// Version 2.0: Expanded with more granular emotions and a flexible structure.

/**
 * @typedef {Object} AnchorDefinition
 * @property {string} emotion - The primary emotion this word anchors to.
 * @property {number} intensity - The base intensity score (0 to 3) this word provides.
 * @property {string[]} [tags] - Optional tags for deeper analysis (e.g., 'cognitive', 'physical').
 */

/**
 * @description قاموس "الكلمات المِرسَاة" التي لها تأثير عاطفي قوي ومباشر.
 * يتم استخدامها بواسطة mood_analyzer لتحديد الحالة المزاجية بسرعة ودقة.
 * تم تغيير الهيكل ليكون أكثر مرونة وقابلية للتوسع.
 * @type {Object.<string, AnchorDefinition>}
 */
export const ANCHOR_WORDS = {
    // --- Positive Anchors (مراسٍ إيجابية) ---
    "مبسوط":      { emotion: "joy", intensity: 2.0 },
    "سعيد":        { emotion: "joy", intensity: 2.0 },
    "فرحان":      { emotion: "joy", intensity: 2.2 },
    "رائع":        { emotion: "joy", intensity: 1.8, tags: ['assessment'] },
    "ممتاز":      { emotion: "joy", intensity: 1.7, tags: ['assessment'] },
    "متحمس":      { emotion: "joy", intensity: 1.9, tags: ['anticipation'] },
    "ممتن":       { emotion: "gratitude", intensity: 2.5 },
    "فخور":        { emotion: "pride", intensity: 2.3 },
    "مرتاح":       { emotion: "calm", intensity: 1.8 },
    "مطمئن":       { emotion: "calm", intensity: 2.0 },
    "متفائل":     { emotion: "hope", intensity: 1.9 },

    // --- Negative Anchors (مراسٍ سلبية) ---
    "حزين":       { emotion: "sadness", intensity: 2.0 },
    "زعلان":       { emotion: "sadness", intensity: 1.8 },
    "مكتئب":       { emotion: "sadness", intensity: 2.5, tags: ['clinical'] },
    "محطم":       { emotion: "sadness", intensity: 2.8, tags: ['physical'] },
    "منهار":       { emotion: "sadness", intensity: 3.0, tags: ['physical', 'loss-of-control'] },
    "يائس":       { emotion: "sadness", intensity: 2.7, tags: ['hopelessness'] },
    "قلق":         { emotion: "anxiety", intensity: 2.0 },
    "متوتر":       { emotion: "anxiety", intensity: 1.9 },
    "خايف":       { emotion: "fear", intensity: 2.2 },
    "مرعوب":       { emotion: "fear", intensity: 2.8 },
    "غاضب":        { emotion: "anger", intensity: 2.3 },
    "غضبان":       { emotion: "anger", intensity: 2.3 },
    "مستفز":       { emotion: "anger", intensity: 1.9 },
    "وحيد":        { emotion: "loneliness", intensity: 2.4 },
    "مخذول":      { emotion: "disappointment", intensity: 2.1 },
    "ندمان":       { emotion: "guilt", intensity: 2.2 },
    "مكسوف":      { emotion: "shame", intensity: 2.5 },

    // --- Complex State Anchors (مراسٍ لحالات معقدة) ---
    "ضايع":        { emotion: "confusion", intensity: 2.2, tags: ['directionless'] },
    "تايه":         { emotion: "confusion", intensity: 2.2, tags: ['directionless'] },
    "مشتت":       { emotion: "confusion", intensity: 1.8, tags: ['cognitive'] },
    "مضغوط":       { emotion: "stress", intensity: 2.1 },
    "تعبان":       { emotion: "fatigue", intensity: 1.9, tags: ['physical'] },
    "مرهق":        { emotion: "fatigue", intensity: 2.3, tags: ['physical'] }
};
