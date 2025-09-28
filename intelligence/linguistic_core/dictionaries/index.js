// intelligence/linguistic_core/dictionaries/index.js

import { CONCEPT_MAP, CONCEPT_DEFINITIONS } from './concepts.js';
import { STOP_WORDS } from './stop_words.js';
import { CAUSAL_PATTERNS, NARRATIVE_TENSIONS } from './patterns.js';
import { GENERATIVE_LEXICON } from './generative.js';
import { PREFIXES, SUFFIXES } from './affixes.js';
import { INTENSIFIERS } from './intensifiers.js';
import { ANCHOR_MOODS } from './anchors.js'; // <-- 1. استيراد القاموس الجديد

// قائمة مركزية بكل الحالات المزاجية المتاحة في النظام
export const AVAILABLE_MOODS = ['supportive', 'calming', 'empowering', 'celebratory', 'reflective'];

// نصدر كل القواميس ككائن واحد لتسهيل الوصول إليها من باقي أجزاء المكتبة.
export const Dictionaries = {
    CONCEPT_MAP,
    CONCEPT_DEFINITIONS,
    STOP_WORDS,
    CAUSAL_PATTERNS,
    NARRATIVE_TENSIONS,
    GENERATIVE_LEXICON,
    PREFIXES,
    SUFFIXES,
    AVAILABLE_MOODS,
    INTENSIFIERS,
    ANCHOR_MOODS, // <-- 2. إضافة القاموس الجديد إلى الكائن المُصدَّر
};
