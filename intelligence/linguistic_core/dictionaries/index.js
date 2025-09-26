// intelligence/linguistic_core/dictionaries/index.js

import { CONCEPT_MAP, CONCEPT_DEFINITIONS } from './concepts.js';
import { STOP_WORDS } from './stop_words.js';
import { CAUSAL_PATTERNS, NARRATIVE_TENSIONS } from './patterns.js'; // <-- تعديل هنا
import { GENERATIVE_LEXICON } from './generative.js';
import { PREFIXES, SUFFIXES } from './affixes.js';
import { INTENSIFIERS } from './intensifiers.js';

export const AVAILABLE_MOODS = ['supportive', 'calming', 'empowering', 'celebratory', 'reflective'];

export const Dictionaries = {
    CONCEPT_MAP,
    CONCEPT_DEFINITIONS,
    STOP_WORDS,
    CAUSAL_PATTERNS,
    NARRATIVE_TENSIONS, // <-- إضافة جديدة
    GENERATIVE_LEXICON,
    PREFIXES,
    SUFFIXES,
    AVAILABLE_MOODS,
    INTENSIFIERS,
};
