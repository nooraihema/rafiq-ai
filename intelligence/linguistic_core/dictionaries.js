// intelligence/linguistic_core/dictionaries.js

// قاموس المرادفات والمفاهيم الأساسية
export const CONCEPT_MAP = {
  "حزن": "sadness",
  "مكتئب": "sadness",
  "مخنوق": "sadness",
  "قلق": "anxiety",
  "خايف": "anxiety",
  "متوتر": "anxiety",
  // ... إلخ
};

// الكلمات الشائعة التي يجب تجاهلها في التحليل
export const STOP_WORDS = ["في","من","على","مع","أنا","هو","هي","و","ال","يا"];

// [للمستقبل] قاموس الأنماط السببية
export const CAUSAL_PATTERNS = [
    {
        concepts: ["sadness", "helplessness"], 
        hypothesis: "كتير مننا لما بيحس بالحزن الشديد، ده بيستنزف طاقته وبيخليه يحس بالعجز...",
    },
    // ... المزيد من الأنماط
];

// [للمستقبل] قاموس التوليد اللغوي
export const GENERATIVE_LEXICON = {
    supportive: {
        openers: ["كلامك لمسني جدًا", "خليني أقولك حاجة من قلبي"],
        // ... إلخ
    },
    calming: { /* ... */ }
};
