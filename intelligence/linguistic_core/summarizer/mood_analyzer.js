
// intelligence/linguistic_core/summarizer/mood_analyzer.js
// Version 8.0: Dynamic Blending + Temporal Memory + Meta-Layer + Anchors

import { Dictionaries } from '../dictionaries/index.js';
import { safeStr } from '../utils.js';

// خريطة المشاعر الأساسية للمزاج
const EMOTION_TO_MOOD_MAP = {
    anxiety: 'calming', fear: 'calming',
    sadness: 'supportive', grief: 'supportive',
    joy: 'celebratory', pride: 'empowering',
};

const BASE_SMOOTHING_FACTOR = 0.25;
const TEMPORAL_WINDOW = 5; // عدد الرسائل اللي ناخد منها trend
let moodHistory = []; // الذاكرة المؤقتة

/**
 * [للمستقبل] Feedback loop: تعديل الأوزان بناءً على تقييم المستخدم
 */
export function updateWeights(concept, mood, feedback) {
    const conceptData = Dictionaries.CONCEPT_DEFINITIONS[concept];
    if (!conceptData || !conceptData.mood_weights) return;

    if (!conceptData.mood_weights[mood]) conceptData.mood_weights[mood] = 0.1;
    conceptData.mood_weights[mood] =
        conceptData.mood_weights[mood] * 0.9 + feedback * 0.1;
}

/**
 * يحلل السياق الكامل لإنتاج خريطة مزاجية متقدمة مع تعلم ذاتي وطبقات ذكية
 */
export function analyzeMood(
    semanticMap,
    fingerprint = {},
    lastMood = 'supportive',
    moodStreak = 0
) {
    const moodScores = Object.fromEntries(
        Dictionaries.AVAILABLE_MOODS.map((mood) => [mood, 0.0])
    );
    const primaryEmotion = fingerprint?.primaryEmotion?.type || null;
    const originalMessage = safeStr(fingerprint?.originalMessage);

    // --- 1. التنعيم التكيفي مع التضاؤل ---
    let temporalFactor = BASE_SMOOTHING_FACTOR / (1 + moodStreak * 0.5);
    if (primaryEmotion && lastMood !== EMOTION_TO_MOOD_MAP[primaryEmotion])
        temporalFactor /= 2;
    if (lastMood && moodScores[lastMood] !== undefined)
        moodScores[lastMood] += temporalFactor;

    // --- 2. تعزيز المشاعر الأولية ---
    if (primaryEmotion && EMOTION_TO_MOOD_MAP[primaryEmotion]) {
        moodScores[EMOTION_TO_MOOD_MAP[primaryEmotion]] += 1.5;
    }

    // --- 3. نقاط المفاهيم مع حماية من undefined ---
    const conceptFrequencies = semanticMap?.frequencies?.concepts || {};
    for (const [concept, freq] of Object.entries(conceptFrequencies)) {
        const conceptData = Dictionaries.CONCEPT_DEFINITIONS[concept];
        if (conceptData?.mood_weights) {
            for (const [mood, weight] of Object.entries(
                conceptData.mood_weights
            )) {
                if (moodScores[mood] !== undefined) {
                    moodScores[mood] += weight * Math.log1p(freq);
                }
            }
        }
    }

    // --- 4. المعدلات السياقية + Semantic Anchors ---
    let intensityModifier = 1.0;
    const normalizedTokens =
        semanticMap?.list?.allTokens?.map((t) => t.normalized) || [];

    for (const token of normalizedTokens) {
        if (Dictionaries.INTENSIFIERS[token]) {
            intensityModifier +=
                (Dictionaries.INTENSIFIERS[token] - 1.0) * 0.5;
        }
        if (Dictionaries.ANCHOR_MOODS?.[token]) {
            // anchor قوي يتجاوز الحسابات
            const anchorMood = Dictionaries.ANCHOR_MOODS[token];
            if (moodScores[anchorMood] !== undefined) {
                moodScores[anchorMood] += 2.0;
            }
        }
    }
    if (originalMessage.length > 150) intensityModifier += 0.1;
    if (originalMessage.includes('!!') || originalMessage.includes('؟؟'))
        intensityModifier += 0.2;

    for (const mood in moodScores) moodScores[mood] *= intensityModifier;

    // --- 5. Softmax ---
    const expScores = Object.values(moodScores).map((score) => Math.exp(score));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probabilities = {};
    Object.keys(moodScores).forEach((mood, index) => {
        probabilities[mood] =
            sumExp > 0
                ? expScores[index] / sumExp
                : 1 / Object.keys(moodScores).length;
    });

    // --- 6. Dynamic Blending بدلاً من فائز واحد ---
    const sortedMoods = Object.entries(probabilities).sort(
        ([, a], [, b]) => b - a
    );
    const topMoods = sortedMoods.slice(0, 3); // ناخد أفضل 3
    let finalMood = topMoods.map(([m, p]) => `${m}:${(p * 100).toFixed(1)}%`).join('|');
    let isComposite = topMoods.length > 1;

    const winnerProb = topMoods[0][1];
    const runnerUpProb = topMoods.length > 1 ? topMoods[1][1] : 0.0;
    const intensity = winnerProb - runnerUpProb;

    // --- 7. Temporal Memory Adaptation ---
    moodHistory.push(probabilities);
    if (moodHistory.length > TEMPORAL_WINDOW) moodHistory.shift();

    const averagedDistribution = {};
    for (const mood of Object.keys(probabilities)) {
        averagedDistribution[mood] =
            moodHistory.reduce((sum, hist) => sum + (hist[mood] || 0), 0) /
            moodHistory.length;
    }

    // --- 8. Meta-Layer Self-Correction ---
    let confidence = winnerProb;
    if (originalMessage.length < 20) confidence *= 0.7;
    if (confidence < 0.3) {
        // الثقة ضعيفة → fallback على التوزيع التاريخي
        const historicalTop = Object.entries(averagedDistribution).sort(
            ([, a], [, b]) => b - a
        )[0][0];
        finalMood = `historical-${historicalTop}`;
    }

    if (Object.values(moodScores).every((s) => s < 0.1)) {
        return {
            mood: 'supportive',
            confidence: 0.5,
            intensity: 0.5,
            distribution: averagedDistribution,
            isComposite: false,
        };
    }

    return {
        mood: finalMood,
        confidence,
        intensity,
        distribution: averagedDistribution,
        isComposite,
    };
}

