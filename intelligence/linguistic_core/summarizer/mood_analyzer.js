// intelligence/linguistic_core/summarizer/mood_analyzer.js
// Version 8.1: Safe, Multi-User State Management
// This version preserves the full intelligence of v8.0 while fixing the critical
// shared state issue by properly isolating moodHistory within the user's state object.

import { Dictionaries } from '../../dictionaries/index.js';
import { safeStr } from '../../utils.js';

const EMOTION_TO_MOOD_MAP = {
    anxiety: 'calming', fear: 'calming',
    sadness: 'supportive', grief: 'supportive',
    joy: 'celebratory', pride: 'empowering',
};

const BASE_SMOOTHING_FACTOR = 0.25;
const TEMPORAL_WINDOW = 5; // عدد الرسائل في الذاكرة الزمنية

/**
 * يحلل السياق الكامل لإنتاج خريطة مزاجية متقدمة.
 * @param {object} semanticMap
 * @param {object} fingerprint
 * @param {object} userState - [تعديل] كائن حالة المستخدم الذي يحتوي على الذاكرة
 * @returns {object} - الكائن المطور بالكامل { mood, confidence, ... }
 */
export function analyzeMood(semanticMap, fingerprint = {}, userState = {}) {
    // [تصحيح] التأكد من وجود قيم افتراضية آمنة لحالة المستخدم
    const lastMood = userState.lastMood || 'supportive';
    const moodStreak = userState.moodStreak || 0;
    const moodHistory = userState.moodHistory || [];

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

    // --- 3. نقاط المفاهيم ---
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

    // --- 4. المعدلات السياقية + المراسي الدلالية ---
    let intensityModifier = 1.0;
    const normalizedTokens =
        semanticMap?.list?.allTokens?.map((t) => t.normalized) || [];

    for (const token of normalizedTokens) {
        if (Dictionaries.INTENSIFIERS[token]) {
            intensityModifier +=
                (Dictionaries.INTENSIFIERS[token] - 1.0) * 0.5;
        }
        if (Dictionaries.ANCHOR_MOODS?.[token]) {
            const anchorMood = Dictionaries.ANCHOR_MOODS[token];
            if (moodScores[anchorMood] !== undefined) {
                moodScores[anchorMood] += 2.0; // Anchor words have a strong effect
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

    // --- 6. المزج الديناميكي ---
    const sortedMoods = Object.entries(probabilities).sort(
        ([, a], [, b]) => b - a
    );
    let topMoods = sortedMoods.slice(0, 3);
    let finalMood = topMoods[0][0]; // Default winner
    let isComposite = false;

    // Dynamic Blending Logic
    if (topMoods.length > 1 && (topMoods[0][1] / topMoods[1][1]) < 1.8) {
        finalMood = topMoods.filter(m => m[1] > 0.15) // Filter out very weak moods
                           .map(([m, p]) => `${m}:${(p * 100).toFixed(0)}%`)
                           .join('|');
        isComposite = finalMood.includes('|');
    }
    
    const winnerProb = topMoods[0][1];
    const runnerUpProb = topMoods.length > 1 ? topMoods[1][1] : 0.0;
    const intensity = winnerProb - runnerUpProb;

    // --- 7. [تصحيح] تحديث ذاكرة المستخدم التي تم تمريرها ---
    moodHistory.push(probabilities);
    if (moodHistory.length > TEMPORAL_WINDOW) moodHistory.shift();

    const averagedDistribution = {};
    for (const mood of Object.keys(probabilities)) {
        averagedDistribution[mood] =
            moodHistory.reduce((sum, hist) => sum + (hist[mood] || 0), 0) /
            moodHistory.length;
    }

    // --- 8. طبقة الميتا والتصحيح الذاتي ---
    let confidence = winnerProb;
    if (originalMessage.length < 20) confidence *= 0.7;
    let finalMoodToReturn = finalMood;

    if (confidence < 0.35 && Object.keys(averagedDistribution).length > 0) {
        const historicalTop = Object.entries(averagedDistribution).sort(
            ([, a], [, b]) => b - a
        )[0][0];
        finalMoodToReturn = `historical_fallback:${historicalTop}`;
    }

    if (Object.values(moodScores).every((s) => s < 0.1)) {
        return {
            mood: 'supportive', confidence: 0.5, intensity: 0.5,
            distribution: averagedDistribution, isComposite: false,
        };
    }

    return {
        mood: finalMoodToReturn,
        confidence,
        intensity,
        distribution: averagedDistribution,
        isComposite,
    };
}
