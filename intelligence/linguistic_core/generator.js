// intelligence/linguistic_core/generator.js
import { GENERATIVE_LEXICON } from './dictionaries.js';
import { sample } from './utils.js'; // استيراد الدالة من الملف المحلي الصحيح

/**
 * يولد ردًا جديدًا بناءً على ملخص الموقف.
 * @param {object} summary - "ملف الموقف" من Summarizer.
 * @returns {string} - الرد المولد.
 */
export function generateReply(summary) {
  const mood = 'supportive'; // مؤقتًا
  const lexicon = GENERATIVE_LEXICON[mood];
  
  const opener = sample(lexicon.openers);
  const concept = summary.dominantConcept;

  if (concept === "unknown") {
    return "أتفهم أن هذا الموقف صعب. أنا هنا لأسمعك.";
  }
  
  return `${opener}، يبدو أن موضوع '${concept}' هو أكثر ما يشغل تفكيرك الآن. أنا هنا معاك.`;
}
