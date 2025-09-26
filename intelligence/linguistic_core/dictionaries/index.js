// intelligence/linguistic_core/dictionaries/index.js

import { CONCEPT_MAP, CONCEPT_DEFINITIONS } from './concepts.js'; // <-- تأكد من استيراد الاثنين
import { STOP_WORDS } from './stop_words.js';
import { CAUSAL_PATTERNS } from './patterns.js';
import { GENERATIVE_LEXICON } from './generative.js';
import { PREFIXES, SUFFIXES } from './affixes.js';

// --- [إضافة جديدة] --- قائمة مركزية بكل الحالات المزاجية المتاحة في النظام
export const AVAILABLE_MOODS = ['supportive', 'calming', 'empowering', 'celebratory', 'reflective'];

export const Dictionaries = {
    CONCEPT_MAP,
    CONCEPT_DEFINITIONS, // <-- تأكد من تصديره
    STOP_WORDS,
    CAUSAL_PATTERNS,
    GENERATIVE_LEXICON,
    PREFIXES,
    SUFFIXES,
    AVAILABLE_MOODS, // <-- تأكد من تصديره
};
