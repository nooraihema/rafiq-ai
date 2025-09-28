
// intelligence/linguistic_core/generator/index.js
// Version 2.0: The Creative Synthesizer
// This version is designed to be a pure "synthesis" engine. It receives a rich,
// pre-analyzed summary object and creatively composes a response based on it,
// without performing any analysis itself.

import { Dictionaries } from '../dictionaries/index.js';
import { sample } from '../utils.js';

/**
 * الوظيفة الرئيسية لوحدة Generator.
 * @param {object} summary - "ملف الموقف النفسي" الكامل والجاهز من Summarizer.
 * @returns {string} - الرد النهائي المؤلف.
 */
export function generateReply(summary) {
    // 1. استخلاص البيانات الجاهزة من الملخص. لا حاجة لأي تحليل هنا.
    const {
        mood,
        moodConfidence,
        narrativeTension,
        dominantConcept,
        implicitNeed,
    } = summary;

    // 2. اختيار القاموس اللغوي بناءً على الحالة المزاجية المحددة مسبقًا.
    const moodKey = mood.split('+')[0]; // نأخذ المزاج الأساسي في حالة المزاج المركب
    const lexicon = Dictionaries.GENERATIVE_LEXICON[moodKey] || Dictionaries.GENERATIVE_LEXICON['supportive'];

    const opener = sample(lexicon.openers);
    const connector = sample(lexicon.connectors);
    const closer = sample(lexicon.closers);

    // 3. [الأولوية القصوى] التعامل مع التوتر السردي إذا وجد.
    if (narrativeTension) {
        // إذا كان هناك صراع، يجب أن يكون هو محور الرد
        const tensionDescription = `أتفهم أنك تعيش في صراع بين "${narrativeTension.conflictingConcepts[0]}" و "${narrativeTension.conflictingConcepts[1]}".`;
        return `${opener}. ${tensionDescription} ${closer}`;
    }

    // 4. [الأولوية الثانية] البحث عن "نمط سببي" ذكي.
    if (dominantConcept) {
        for (const pattern of Dictionaries.CAUSAL_PATTERNS) {
            if (pattern.concepts.includes(dominantConcept)) {
                console.log(`[Generator] Found Causal Pattern for: '${dominantConcept}'`);
                return `${opener}. ${pattern.hypothesis} ${closer}`;
            }
        }
    }
    
    // 5. [الخطة الاحتياطية] بناء رد يعتمد على الحاجة والمفهوم المهيمن.
    if (dominantConcept === "unknown" || !dominantConcept) {
        return `${opener}. من الواضح أنك تمر بشيء عميق قد يكون من الصعب وصفه بالكلمات. ${closer}`;
    }

    // البحث عن الكلمة العربية للمفهوم
    const arabicTerm = Object.keys(Dictionaries.CONCEPT_MAP).find(key => 
        (Array.isArray(Dictionaries.CONCEPT_MAP[key]) ? Dictionaries.CONCEPT_MAP[key].includes(dominantConcept) : Dictionaries.CONCEPT_MAP[key] === dominantConcept)
    ) || dominantConcept;
    
    let needSentence = "";
    if (implicitNeed === 'validation') {
        needSentence = `من الطبيعي جدًا أن تشعر بهذا. مشاعرك حقيقية ومهمة.`;
    } else if (implicitNeed === 'guidance') {
        needSentence = `خلينا نفكر مع بعض في خطوات بسيطة ممكن تساعد في الموقف ده.`;
    }

    return `${opener}، ${connector} يبدو أن موضوع '${arabicTerm}' هو أكثر ما يؤثر عليك الآن. ${needSentence} ${closer}`;
}
