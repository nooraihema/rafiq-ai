// intelligence/linguistic_core/dictionaries/affixes.js
// قوائم بالسوابق واللواحق للغة العربية لدعم التجذير المتقدم

export const PREFIXES = [
    "ال", "و", "ف", "ب", "ك", "ل", "لل", // سوابق عامة
    "ا", "ت", "ن", "ي" // سوابق الأفعال المضارعة (بشكل مبسط)
];

export const SUFFIXES = [
    "ون", "ين", "ات", "ان", // جموع ومثنى
    "وا", "ها", "هم", "هن", "كم", "كن", "ه", "ك", "ي", "نا" // ضمائر متصلة
];
```

**ج. `dictionaries/index.js` (المعدل)**
```javascript
// intelligence/linguistic_core/dictionaries/index.js
import { CONCEPT_MAP } from './concepts.js';
import { STOP_WORDS } from './stop_words.js';
import { CAUSAL_PATTERNS } from './patterns.js';
import { GENERATIVE_LEXICON } from './generative.js';
import { PREFIXES, SUFFIXES } from './affixes.js'; // <-- إضافة جديدة

export const Dictionaries = {
    CONCEPT_MAP,
    STOP_WORDS,
    CAUSAL_PATTERNS,
    GENERATIVE_LEXICON,
    PREFIXES, // <-- إضافة جديدة
    SUFFIXES, // <-- إضافة جديدة
};
