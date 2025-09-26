// intelligence/linguistic_core/generator/index.js
import { Dictionaries } from '../dictionaries/index.js';
import { sample } from '../utils.js';

/**
 * الوظيفة الرئيسية لوحدة Generator (النسخة المصححة).
 * @param {object} summary - "ملف الموقف" من Summarizer.
 * @returns {string} - الرد المولد.
 */
export function generateReply(summary) {
    const mood = 'supportive'; // سيتم تحديده ديناميكيًا في المستقبل
    const lexicon = Dictionaries.GENERATIVE_LEXICON[mood];
    
    const opener = sample(lexicon.openers);
    const connector = sample(lexicon.connectors);
    const closer = sample(lexicon.closers);
    const dominantConcept = summary.dominantConcept[0] || "unknown"; // نأخذ أول مفهوم مهيمن

    // [تصحيح] الخطة (أ): البحث عن استنتاج ذكي أولاً
    // نحن نبحث إذا كان أي من المفاهيم المكتشفة يطابق نمطًا
    for (const concept of summary.dominantConcept) {
        for (const pattern of Dictionaries.CAUSAL_PATTERNS) {
            if (pattern.concepts.includes(concept)) {
                 // وجدنا استنتاجًا ذكيًا! لنستخدمه.
                 console.log(`[Generator] Found a matching Causal Pattern for concept: '${concept}'`);
                 return `${opener}. ${pattern.hypothesis} ${closer}`;
            }
        }
    }
    
    // [تصحيح] الخطة (ب): الخطة الاحتياطية، تعمل فقط إذا فشلت الخطة (أ)
    console.log(`[Generator] No Causal Pattern found. Using fallback logic for concept: '${dominantConcept}'`);
    if (dominantConcept === "unknown") {
        return "أتفهم أن هذا الموقف صعب. أنا هنا لأسمعك.";
    }
    
    // نستخدم الكلمة العربية الأصلية من القاموس بدلاً من اسم المفهوم
    const arabicTerm = Object.keys(Dictionaries.CONCEPT_MAP).find(key => Dictionaries.CONCEPT_MAP[key].includes(dominantConcept)) || dominantConcept;
    
    return `${opener}، ${connector} موضوع '${arabicTerm}' هو أكثر ما يشغل تفكيرك الآن. ${closer}`;
}
