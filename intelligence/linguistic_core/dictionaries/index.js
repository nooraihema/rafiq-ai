// intelligence/linguistic_core/dictionaries/index.js

import { CONCEPT_MAP } from './concepts.js';
import { STOP_WORDS } from './stop_words.js';
import { CAUSAL_PATTERNS } from './patterns.js';
import { GENERATIVE_LEXICON } from './generative.js';

// نصدر كل القواميس ككائن واحد لتسهيل الوصول إليها من باقي أجزاء المكتبة.
export const Dictionaries = {
    CONCEPT_MAP,
    STOP_WORDS,
    CAUSAL_PATTERNS,
    GENERATIVE_LEXICON,
};
