
// /core/utils.js - Browser Optimized v2.2
// تم تعديله ليعمل داخل المتصفح (الهاتف) وحذف تبعيات Node.js

// ============================================================================
// 1. General Purpose Utilities (الأدوات العامة)
// ============================================================================

/**
 * يقوم بإنشاء معرف فريد للمستخدم (User ID) يعمل في المتصفح.
 * @returns {string}
 */
export function makeUserId() {
  // استخدام Web Crypto API المدمج في المتصفح بدلاً من مكتبة crypto الخاصة بـ Node
  const array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * يختار عنصرًا عشوائيًا من مصفوفة.
 */
export function sample(arr) { 
    if (!arr || arr.length === 0) return null; 
    return arr[Math.floor(Math.random() * arr.length)]; 
}

/**
 * يحول أي قيمة إلى سلسلة نصية آمنة (string).
 */
export function safeStr(s) { 
    return (s === null || s === undefined) ? "" : String(s); 
}

/**
 * يضمن أن القيمة تقع ضمن نطاق محدد (min/max).
 */
export function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(value, max));
}

/**
 * يقوم بعمل نسخة عميقة من كائن (JSON-serializable).
 */
export function deepClone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        console.error("Failed to deep clone object:", obj, e);
        return null;
    }
}

// ============================================================================
// 2. Linguistic & Text Processing Utilities (أدوات معالجة اللغة)
// ============================================================================

/**
 * يقوم بتطبيع النص العربي (تنظيف شامل).
 */
export function normalizeArabic(text = "") {
  let s = safeStr(text);
  s = s.replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  s = s.replace(/[\u064B-\u0652]/g, "");
  s = s.replace(/ـ/g, "");
  s = s.replace(/[^\u0621-\u064A\u0660-\u0669\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * يقطع النص إلى مصفوفة من الكلمات النظيفة (Tokens).
 */
export function tokenize(text, stopwords = new Set()) {
  const normalized = normalizeArabic(text);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(word => word && !stopwords.has(word));
}

/**
 * يولد N-grams من مصفوفة كلمات.
 */
export function generateNgrams(tokens, n = [2, 3]) {
    const ngrams = [];
    const sizes = Array.isArray(n) ? n : [n];
    
    for (const size of sizes) {
        if (tokens.length >= size) {
            for (let i = 0; i <= tokens.length - size; i++) {
                ngrams.push(tokens.slice(i, i + size).join(' '));
            }
        }
    }
    return ngrams;
}

// ============================================================================
// 3. AI & Data Structure Utilities (أدوات الذكاء الاصطناعي)
// ============================================================================

/**
 * تطبيع ناعم (Soft Normalization) لقيم كائن.
 */
export function softNormalize(scoreObject) {
    const scores = Object.values(scoreObject);
    if (scores.length === 0) return {};
    const maxScore = Math.max(...scores);
    if (maxScore === 0) return scoreObject;
    const normalized = {};
    for (const key in scoreObject) {
        normalized[key] = scoreObject[key] / maxScore;
    }
    return normalized;
}

/**
 * يدمج اثنين من "الحمض النووي العاطفي" (Emotional DNA).
 */
export function blendDna(baseDna, targetDna, weight) {
    const blended = { ...baseDna };
    const w = clamp(weight, 0, 1);
    for (const key in targetDna) {
        if (blended.hasOwnProperty(key) && typeof blended[key] === 'number') {
            blended[key] = baseDna[key] * (1 - w) + targetDna[key] * w;
        }
    }
    return blended;
}

/**
 * يختار أفضل N عنصر من كائن درجات.
 */
export function getTopN(scoreObject, topN = 3) {
    return Object.entries(scoreObject)
        .sort(([, a], [, b]) => b - a)
        .slice(0, topN)
        .map(([key, score]) => ({ key, score }));
}

/**
 * إنشاء مولد لتسلسل الحوار.
 */
export function* createDialogueSequencer(questionSequence) {
    if (!questionSequence || questionSequence.length === 0) return;
    for (const question of questionSequence) {
        yield question;
    }
    yield questionSequence[questionSequence.length - 1];
}

// ============================================================================
// 4. Integrated Insight Utilities (أدوات الرؤى المتكاملة)
// ============================================================================

/**
 * يحدد القطبية العامة بناءً على بروفايل عاطفي.
 */
export function getSentimentFromAffectVector(affectVector = {}) {
    const positiveScore = (affectVector.joy || 0) + (affectVector.hope || 0) + (affectVector.empowering || 0);
    const negativeScore = (affectVector.sadness || 0) + (affectVector.anxiety || 0) + (affectVector.anger || 0) + (affectVector.fear || 0);

    if (positiveScore > 0.1 && negativeScore > 0.1) return 'mixed';
    if (positiveScore > negativeScore && positiveScore > 0.1) return 'positive';
    if (negativeScore > positiveScore && negativeScore > 0.1) return 'negative';
    return 'neutral';
}

/**
 * يولد "بصمة معرفية" متكاملة للنص.
 */
export async function createCognitiveFingerprint(text, brain) {
    // نستخدم الوظيفة الموجودة في الدماغ اللغوي
    if (!brain || !brain.analyze) {
        throw new Error("A valid LinguisticBrain instance is required.");
    }

    const insight = await brain.analyze(text);
    if (!insight) return null;
    
    const topEmotion = getTopN(insight.emotionProfile?.affectVector || {}, 1)[0] || { key: 'neutral', score: 0 };
    const topConcept = getTopN(insight.semanticMap?.conceptInsights || {}, 1)[0] || { key: 'none', score: 0 };
    const sentiment = getSentimentFromAffectVector(insight.emotionProfile?.affectVector || {});

    return {
        normalizedText: text,
        tokens: insight.semanticMap?.tokens || [],
        sentiment: sentiment,
        primaryEmotion: topEmotion.key,
        primaryEmotionScore: topEmotion.score,
        primaryConcept: topConcept.key,
        primaryConceptScore: topConcept.score,
        fullInsight: insight
    };
}
