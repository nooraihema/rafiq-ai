// intelligence/linguistic_core/generator/index.js
import { Dictionaries } from '../../dictionaries/index.js';
import { sample } from '../../utils.js';

/**
 * الوظيفة الرئيسية لوحدة Generator (حاليا تستخدم قوالب بسيطة).
 * @param {object} summary - "ملف الموقف" من Summarizer.
 * @returns {string} - الرد المولد.
 */
export function generateReply(summary) {
    const mood = 'supportive'; // سيتم تحديده ديناميكيًا في المستقبل
    const lexicon = Dictionaries.GENERATIVE_LEXICON[mood];
    
    const opener = sample(lexicon.openers);
    const connector = sample(lexicon.connectors);
    const closer = sample(lexicon.closers);
    const concept = summary.dominantConcept;

    if (concept === "unknown") {
        return "أتفهم أن هذا الموقف صعب. أنا هنا لأسمعك.";
    }
    
    for (const pattern of Dictionaries.CAUSAL_PATTERNS) {
        if (pattern.concepts.includes(concept)) {
             return `${opener}. ${pattern.hypothesis} ${closer}`;
        }
    }
    
    return `${opener}، يبدو أن موضوع '${concept}' هو أكثر ما يشغل تفكيرك الآن. ${closer}`;
}
