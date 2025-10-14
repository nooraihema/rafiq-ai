// /core/utils.js
// AI Toolkit v2.1 - Integrated Insight with User ID generation
// A collection of intelligent, data-aware utility functions designed to support
// the advanced dictionaries and analysis engines.

// --- [إضافة جديدة] ---
import crypto from 'crypto';

// ============================================================================
// 1. General Purpose Utilities (الأدوات العامة)
// ============================================================================

/**
 * [إضافة جديدة]
 * يقوم بإنشاء معرف فريد للمستخدم (User ID).
 * @returns {string}
 */
export function makeUserId() {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * يختار عنصرًا عشوائيًا من مصفوفة.
 * @param {Array<T>} arr - المصفوفة للاختيار منها.
 * @returns {T|null} عنصر عشوائي أو null إذا كانت المصفوفة فارغة.
 */
export function sample(arr) { 
    if (!arr || arr.length === 0) return null; 
    return arr[Math.floor(Math.random() * arr.length)]; 
}

/**
 * يحول أي قيمة إلى سلسلة نصية آمنة (string).
 * @param {*} s - القيمة المراد تحويلها.
 * @returns {string} سلسلة نصية فارغة في حالة null/undefined.
 */
export function safeStr(s) { 
    return (s === null || s === undefined) ? "" : String(s); 
}

/**
 * يضمن أن القيمة تقع ضمن نطاق محدد (min/max).
 * @param {number} value - القيمة المراد تقييدها.
 * @param {number} min - الحد الأدنى.
 * @param {number} max - الحد الأقصى.
 * @returns {number}
 */
export function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(value, max));
}

/**
 * يقوم بعمل نسخة عميقة من كائن (JSON-serializable).
 * @param {T} obj - الكائن المراد نسخه.
 * @returns {T}
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
 * @param {string} text 
 * @returns {string}
 */
export function normalizeArabic(text = "") {
  let s = safeStr(text);
  // توحيد الألفات والياء والتاء المربوطة
  s = s.replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  // إزالة الحركات وعلامات التشكيل
  s = s.replace(/[\u064B-\u0652]/g, "");
  // إزالة علامات التطويل والكشيدة
  s = s.replace(/ـ/g, "");
  // إزالة الرموز غير المرغوب فيها مع الحفاظ على الحروف والأرقام والمسافات الأساسية
  s = s.replace(/[^\u0621-\u064A\u0660-\u0669\s]/g, " ");
  // إزالة المسافات الزائدة
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * يقطع النص إلى مصفوفة من الكلمات النظيفة (Tokens).
 * @param {string} text
 * @param {Set<string>} stopwords - مجموعة من الكلمات المستبعدة.
 * @returns {string[]}
 */
export function tokenize(text, stopwords = new Set()) {
  const normalized = normalizeArabic(text);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(word => word && !stopwords.has(word));
}

/**
 * يولد N-grams (ثنائيات، ثلاثيات، ...إلخ) من مصفوفة كلمات.
 * @param {string[]} tokens - مصفوفة الكلمات.
 * @param {number | number[]} n - حجم الـ N-grams.
 * @returns {string[]}
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
// 3. AI & Data Structure Utilities (أدوات الذكاء الاصطناعي وهياكل البيانات)
// ============================================================================

/**
 * يقوم بعملية "تطبيع ناعم" (Soft Normalization) لقيم كائن، محولًا إياها إلى نطاق 0-1.
 * هذا مفيد لتحويل "الدرجات" الخام إلى "نسب".
 * @param {Object.<string, number>} scoreObject - كائن يحتوي على درجات رقمية.
 * @returns {Object.<string, number>} كائن بنفس المفاتيح وقيم موزونة بين 0 و 1.
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
 * يدمج اثنين من "الحمض النووي العاطفي" (Emotional DNA) بناءً على وزن.
 * @param {Object} baseDna - الحمض النووي الأساسي.
 * @param {Object} targetDna - الحمض النووي المراد المزج معه.
 * @param {number} weight - وزن المزج (0 يعني 100% base, 1 يعني 100% target).
 * @returns {Object} حمض نووي جديد مدموج.
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
 * @param {Object.<string, number>} scoreObject 
 * @param {number} topN - عدد العناصر المراد إرجاعها.
 * @returns {{key: string, score: number}[]}
 */
export function getTopN(scoreObject, topN = 3) {
    return Object.entries(scoreObject)
        .sort(([, a], [, b]) => b - a)
        .slice(0, topN)
        .map(([key, score]) => ({ key, score }));
}

/**
 * دالة مساعدة لإنشاء "مولد" (Generator) لتسلسل الحوار الموجه.
 * @param {string[]} questionSequence - مصفوفة الأسئلة.
 * @yields {string} السؤال التالي في كل مرة يتم استدعاؤه.
 */
export function* createDialogueSequencer(questionSequence) {
    if (!questionSequence || questionSequence.length === 0) return;
    for (const question of questionSequence) {
        yield question;
    }
    // يبقى عند آخر سؤال إذا تم استدعاؤه أكثر
    yield questionSequence[questionSequence.length - 1];
}

// ============================================================================
// 4. Integrated Insight Utilities (أدوات الرؤى المتكاملة)
// ============================================================================

/**
 * يحدد القطبية العامة (إيجابي/سلبي/مختلط) بناءً على بروفايل عاطفي دقيق.
 * @param {Object.<string, number>} affectVector - البروفايل العاطفي (مخرجات `intensity_analyzer`).
 * @returns {'positive' | 'negative' | 'mixed' | 'neutral'}
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
 * يولد "بصمة معرفية" (Cognitive Fingerprint) متكاملة للنص.
 * هذه الدالة هي نسخة "ذكية" تستدعي المحركات المتقدمة.
 * @param {string} text - النص الخام.
 * @param {LinguisticBrain} brain - نسخة من "الدماغ اللغوي" للوصول للمحركات.
 * @returns {Promise<Object>} بصمة معرفية غنية.
 */
export async function createCognitiveFingerprint(text, brain) {
    if (!brain || !brain.analyzeMessage) {
        throw new Error("A valid LinguisticBrain instance is required.");
    }

    const insight = await brain.analyzeMessage(text);
    if (!insight) return null; // Handle case where analysis fails
    
    const topEmotion = getTopN(insight.emotionalAnchors?.normalized || {}, 1)[0] || { key: 'neutral', score: 0 };
    const topConcept = getTopN(insight.conceptProfile || {}, 1)[0] || { key: 'none', score: 0 };
    const sentiment = getSentimentFromAffectVector(insight.intensity?.affectVector || {});

    const fingerprint = {
        normalizedText: insight.normalized,
        tokens: insight.tokens,
        sentiment: sentiment,
        primaryEmotion: topEmotion.key,
        primaryEmotionScore: topEmotion.score,
        primaryConcept: topConcept.key,
        primaryConceptScore: topConcept.score,
        detectedPatterns: (insight.patterns || []).map(p => p.pattern_id || p.pattern),
        semanticVector: {
            sadness: insight.intensity?.affectVector?.sadness || 0,
            anxiety: insight.intensity?.affectVector?.anxiety || 0,
            joy: insight.intensity?.affectVector?.joy || 0,
            anger: insight.intensity?.affectVector?.anger || 0,
            sentimentScore: sentiment === 'positive' ? 1 : (sentiment === 'negative' ? -1 : 0),
        },
        fullInsight: insight
    };

    return fingerprint;
}
