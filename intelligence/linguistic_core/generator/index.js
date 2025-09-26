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

    // حالة عدم فهم أي مفهوم
    if (concept === "unknown") {
        return "أتفهم أن هذا الموقف صعب. أنا هنا لأسمعك.";
    }
    
    // محاولة إيجاد "نمط سببي" ذكي
    for (const pattern of Dictionaries.CAUSAL_PATTERNS) {
        if (pattern.concepts.includes(concept)) {
             // وجدنا استنتاجًا ذكيًا! لنستخدمه.
             return `${opener}. ${pattern.hypothesis} ${closer}`;
        }
    }
    
    // الخطة الاحتياطية: رد بسيط يعتمد على المفهوم المهيمن فقط
    return `${opener}، يبدو أن موضوع '${concept}' هو أكثر ما يشغل تفكيرك الآن. ${closer}`;
}
```

#### 5. الواجهة الرئيسية للمكتبة `index.js`

أخيرًا، قم بإنشاء ملف `intelligence/linguistic_core/index.js` (إذا لم تكن قد أنشأته بالفعل).

**محتوى `intelligence/linguistic_core/index.js`:**
```javascript
// intelligence/linguistic_core/index.js
import { summarize } from './summarizer/index.js';
import { generateReply } from './generator/index.js';

/**
 * الدالة الرئيسية للمكتبة اللغوية (الواجهة العامة).
 * @param {string} userMessage 
 * @param {object[]} candidates 
 * @returns {object|null}
 */
export function generateAdvancedReply(userMessage, candidates) {
    try {
        console.log("[Linguistic Core] ==> STAGE 1: Summarizing...");
        const summary = summarize(userMessage, candidates);
        console.log("[Linguistic Core] Summary created:", summary);

        console.log("[Linguistic Core] ==> STAGE 2: Generating reply...");
        const replyText = generateReply(summary);
        console.log("[Linguistic Core] Generated reply text:", replyText);

        if (!replyText) {
            console.log("[Linguistic Core] Generation failed. Returning null.");
            return null;
        }

        return {
            reply: replyText,
            source: 'linguistic_core_v1',
            confidence: 0.95,
            metadata: {
                produced_by: 'generative_engine',
                summary: summary,
            }
        };
    } catch (error) {
        console.error("[Linguistic Core] FATAL ERROR:", error);
        return null;
    }
}
