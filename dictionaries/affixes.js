// dictionaries/affixes.js

/**
 * @fileoverview
 * 📘 Arabic Affixes Dictionary (Ultimate Edition v5.0)
 * قاموس ذكي وشامل للسوابق (Prefixes)، اللواحق (Suffixes)،
 * والزوائد الداخلية (Infixes) في اللغة العربية.
 * مصمم خصيصًا لدعم التحليل الصرفي العميق والتجذير الدقيق.
 * يعتمد على هيكل معياري وقابل للتوسع مع درجات احتمالية وسياقية.
 *
 * @author Ibrahim Shahat & Gemini
 * @version 5.0
 */

// =====================================================================================
// 🧩 1. السوابق (Prefixes)
// =====================================================================================

const PREFIXES = [
  // --- أساسية ---
  { value: "ال", type: "definite_article", weight: 0.99, desc: "ال التعريف" },
  { value: "و", type: "conjunction", weight: 0.95, desc: "واو العطف" },
  { value: "ف", type: "conjunction", weight: 0.95, desc: "فاء العطف أو السببية" },
  { value: "ب", type: "preposition", weight: 0.9, desc: "حرف جر (بـ)" },
  { value: "ك", type: "preposition", weight: 0.9, desc: "حرف تشبيه (كـ)" },
  { value: "ل", type: "preposition_or_emphasis", weight: 0.85, desc: "حرف جر أو توكيد" },

  // --- مركبة ---
  { value: "بال", type: "compound_preposition", weight: 0.97, desc: "بـ + ال" },
  { value: "كال", type: "compound_preposition", weight: 0.97, desc: "كـ + ال" },
  { value: "فال", type: "compound_conjunction", weight: 0.96, desc: "فـ + ال" },
  { value: "وال", type: "compound_conjunction", weight: 0.96, desc: "و + ال" },
  { value: "لل", type: "compound_preposition", weight: 0.95, desc: "لام الجر + ال" },

  // --- أفعال ---
  { value: "س", type: "future_marker", weight: 0.85, desc: "سين المستقبل" },
  { value: "سوف", type: "future_marker", weight: 0.9, desc: "سوف المستقبلية" },
  { value: "أ", type: "present_verb_prefix", weight: 0.88, desc: "أ للمضارع أو للاستفهام" },
  { value: "ن", type: "present_verb_prefix", weight: 0.88 },
  { value: "ت", type: "present_verb_prefix", weight: 0.88 },
  { value: "ي", type: "present_verb_prefix", weight: 0.88 },
  { value: "لت", type: "imperative_prefix", weight: 0.8 },
  { value: "فل", type: "imperative_prefix", weight: 0.8 },

  // --- استفهام وتوكيد ---
  { value: "أ", type: "interrogative", weight: 0.6, desc: "همزة الاستفهام" },
];

// =====================================================================================
// 🧩 2. اللواحق (Suffixes)
// =====================================================================================

const SUFFIXES = [
  // --- جمع ومثنى ---
  { value: "ون", type: "masc_plural", weight: 0.98 },
  { value: "ين", type: "masc_plural_or_dual", weight: 0.95 },
  { value: "ات", type: "fem_plural", weight: 0.98 },
  { value: "ان", type: "dual", weight: 0.95 },

  // --- تأنيث ---
  { value: "ة", type: "fem_suffix", weight: 0.9 },
  { value: "ت", type: "fem_suffix_alt", weight: 0.8 },

  // --- ضمائر متصلة ---
  { value: "ه", type: "attached_pronoun", weight: 0.95 },
  { value: "ها", type: "attached_pronoun", weight: 0.95 },
  { value: "هما", type: "attached_pronoun", weight: 0.93 },
  { value: "هم", type: "attached_pronoun", weight: 0.93 },
  { value: "هن", type: "attached_pronoun", weight: 0.9 },
  { value: "ك", type: "attached_pronoun", weight: 0.9 },
  { value: "كم", type: "attached_pronoun", weight: 0.9 },
  { value: "كن", type: "attached_pronoun", weight: 0.9 },
  { value: "ي", type: "attached_pronoun", weight: 0.95 },
  { value: "نا", type: "attached_pronoun", weight: 0.95 },

  // --- تصريف أفعال ---
  { value: "تُ", type: "verb_suffix", weight: 0.97, desc: "تاء المتكلم" },
  { value: "تَ", type: "verb_suffix", weight: 0.97 },
  { value: "تِ", type: "verb_suffix", weight: 0.97 },
  { value: "تما", type: "verb_suffix", weight: 0.95 },
  { value: "تم", type: "verb_suffix", weight: 0.95 },
  { value: "تن", type: "verb_suffix", weight: 0.95 },
  { value: "وا", type: "verb_suffix", weight: 0.97, desc: "واو الجماعة" },
  { value: "ا", type: "verb_suffix", weight: 0.9, desc: "ألف الاثنين" },
  { value: "ن", type: "verb_suffix", weight: 0.85, desc: "نون النسوة" },
  { value: "نَّ", type: "emphatic_nun", weight: 0.9 },
  { value: "نْ", type: "emphatic_nun", weight: 0.85 },

  // --- النسبة والتنوين ---
  { value: "يّ", type: "nisba", weight: 0.95 },
  { value: "ٌ", type: "tanween_damm", weight: 0.9 },
  { value: "ً", type: "tanween_fath", weight: 0.9 },
  { value: "ٍ", type: "tanween_kasr", weight: 0.9 },
];

// =====================================================================================
// 🧩 3. الزوائد الداخلية والأوزان الصرفية (Infixes & Morphological Patterns)
// =====================================================================================

const INFIX_PATTERNS = [
  // --- أوزان الأفعال ---
  "فَعَلَ", "فَعِلَ", "فَعُلَ",
  "فَعَّلَ", "فَاعَلَ", "أَفْعَلَ",
  "تَفَعَّلَ", "تَفَاعَلَ",
  "انْفَعَلَ", "افْتَعَلَ", "افْعَلَّ",
  "اسْتَفْعَلَ",

  // --- أوزان المصادر ---
  "فِعَالَة", "فَعْل", "فُعُول",
  "تَفْعِيل", "مُفَاعَلَة", "إِفْعَال",
  "تَفَعُّل", "تَفَاعُل",
  "انْفِعَال", "افْتِعَال",
  "اسْتِفْعَال",

  // --- المشتقات ---
  "فَاعِل", "مَفْعُول", "مُفْعِل", "مُفْعَل",
  "مُفَعِّل", "مُفَعَّل", "مُفَاعِل", "مُفَاعَل",
  "مُنْفَعِل", "مُفْتَعِل", "مُفْتَعَل",
  "مُسْتَفْعِل", "مُسْتَفْعَل",

  // --- الصفات وصيغ المبالغة ---
  "فَعِيل", "فَعُول", "فَعَّال", "مِفْعَال",
];

// =====================================================================================
// 🧩 4. الاستثناءات الشاذة (Exceptions)
// =====================================================================================

const EXCEPTIONS = [
  "الذي", "التي", "الذين", "اللذان", "اللتان", "أولئك", "هذا", "هذه", "هؤلاء"
];

// =====================================================================================
// 🧠 5. الهيكل الموحد للتصدير (Unified Export)
// =====================================================================================

export const AFFIX_DICTIONARY = {
  prefixes: PREFIXES,
  suffixes: SUFFIXES,
  infixes: INFIX_PATTERNS,
  exceptions: EXCEPTIONS,
};
