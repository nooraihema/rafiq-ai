
// intelligence/linguistic_core/generator/index.js
import { Dictionaries } from '../dictionaries/index.js';
import { sample, safeStr } from '../utils.js';
import { analyzeMood } from '../summarizer/mood_analyzer.js';

/**
 * الوظيفة الرئيسية لوحدة Generator (الإصدار v4.0 المرتبط بـ mood_analyzer).
 * @param {object} summary - "ملف الموقف" من Summarizer (يشمل semanticMap, fingerprint, dominantConcept, implicitNeed).
 * @param {string} lastMood - المزاج السابق (للاستمرارية).
 * @param {number} moodStreak - عدد مرات تكرار المزاج السابق.
 * @returns {string} - الرد المولد.
 */
export function generateReply(summary = {}, lastMood = 'supportive', moodStreak = 0) {
    // --- 1. تحليل المزاج الديناميكي عبر mood_analyzer ---
    const moodResult = analyzeMood(
        summary.semanticMap || {},
        summary.fingerprint || {},
        lastMood,
        moodStreak
    );

    const mood = moodResult.mood || 'supportive';
    const confidence = moodResult.confidence.toFixed(2);

    const lexicon = Dictionaries.GENERATIVE_LEXICON[mood] || Dictionaries.GENERATIVE_LEXICON['supportive'];

    const opener = sample(lexicon.openers || ["أنا معك"]);
    const connector = sample(lexicon.connectors || ["وبالنسبة لي"]);
    const closer = sample(lexicon.closers || [""]);

    // --- 2. تجهيز المفاهيم ---
    let concepts = [];
    if (Array.isArray(summary.dominantConcept)) {
        concepts = summary.dominantConcept;
    } else if (summary.dominantConcept?.concepts) {
        concepts = summary.dominantConcept.concepts;
    } else if (summary.dominantConcept) {
        concepts = [summary.dominantConcept];
    }

    const dominantConcept = safeStr(concepts[0] || "unknown");

    // --- 3. البحث عن Causal Pattern ---
    for (const concept of concepts) {
        for (const pattern of Dictionaries.CAUSAL_PATTERNS) {
            if (pattern.concepts.includes(concept)) {
                console.log(`[Generator] ✅ Found Causal Pattern for concept: '${concept}' | mood: ${mood} (conf ${confidence})`);
                return `${opener}. ${pattern.hypothesis} ${closer}`;
            }
        }
    }

    // --- 4. fallback logic متطور ---
    console.log(`[Generator] ⚠️ No Causal Pattern found. Using fallback for: '${dominantConcept}' | mood: ${mood} (conf ${confidence})`);

    if (dominantConcept === "unknown") {
        return `${opener}. قد يكون من الصعب التعبير عن ما بداخلك الآن، لكني أشعر بك. ${closer}`;
    }

    // 🔹 البحث عن الترجمة العربية من القاموس
    const arabicTerm =
        Object.keys(Dictionaries.CONCEPT_MAP || {}).find(
            key => Dictionaries.CONCEPT_MAP[key].includes(dominantConcept)
        ) || dominantConcept;

    // --- 5. إضافة implicitNeed لو موجود ---
    let needSentence = "";
    if (summary.implicitNeed === "reassurance") {
        needSentence = "يبدو أنك تحتاج بعض الطمأنة الآن، وهذا طبيعي.";
    } else if (summary.implicitNeed === "solution") {
        needSentence = "ربما يساعدك التفكير في خطوات عملية للتعامل مع الأمر.";
    } else if (summary.implicitNeed === "empathy") {
        needSentence = "المهم أن تشعر أنك لست وحدك في هذه التجربة.";
    }

    // --- 6. تركيب الرد النهائي ---
    return `${opener}، ${connector} يبدو أن موضوع '${arabicTerm}' يشغل تفكيرك. ${needSentence} ${closer}`;
}

