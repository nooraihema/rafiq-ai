// intelligence/linguistic_core/dictionaries/index.js
console.log("--- [CORE] Loading: dictionaries/index.js ---");

import { CONCEPT_MAP } from './concepts.js';
import { STOP_WORDS } from './stop_words.js';
import { CAUSAL_PATTERNS } from './patterns.js';
import { GENERATIVE_LEXICON } from './generative.js';
import { PREFIXES, SUFFIXES } from './affixes.js';

export const Dictionaries = {
    CONCEPT_MAP,
    STOP_WORDS,
    CAUSAL_PATTERNS,
    GENERATIVE_LEXICON,
    PREFIXES,
    SUFFIXES,
};

console.log("--- [CORE] Loaded: dictionaries/index.js ---");
