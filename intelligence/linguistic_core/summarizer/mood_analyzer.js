
// intelligence/linguistic_core/summarizer/mood_analyzer.js
// Version 7.1: The Ultimate Adaptive & Self-Refining Psychometric Engine (Fixed & Hardened)

import { Dictionaries } from '../dictionaries/index.js';
import { safeStr } from '../utils.js';

// خريطة المشاعر الأساسية للمزاج
const EMOTION_TO_MOOD_MAP = {
    anxiety: 'calming', fear: 'calming',
    sadness: 'supportive', grief: 'supportive',
    joy: 'celebratory', pride: 'empowering',
};

const BASE_SMOOTHING_FACTOR = 0.25;

/**
 * [للمستقبل] Feedback loop: تعديل الأوزان بناءً على تقييم المستخدم
 * @param {string} concept - المفهوم
 * @param {string} mood - المزاج الناتج
 * @param {number} feedback - درجة النجاح (0-1)
 */
export function updateWeights(concept, mood, feedback) {
    const conceptData = Dictionaries.CONCEPT_DEFINITIONS[concept];
    if (!conceptData || !conceptData.mood_weights) return;

    if (!conceptData.mood_weights[mood]) conceptData.mood_weights[mood] = 0.1;
    conceptData.mood_weights[mood] = conceptData.mood_weights[mood] * 0.9 + feedback * 0.1;
}

/**
 * يحلل السياق الكامل لإنتاج خريطة مزاجية متقدمة مع تعلم ذاتي
 * @param {object} semanticMap - الخريطة الدلالية من tokenizer
 * @param {object} fingerprint - بصمة الرسالة
 * @param {string} [lastMood='supportive'] - المزاج السابق
 * @param {number} [moodStreak=0] - عدد مرات تكرار المزاج السابق
 * @returns {{mood: string, confidence: number, intensity: number, distribution: object, isComposite: boolean}}
 */
export function analyzeMood(semanticMap, fingerprint = {}, lastMood = 'supportive', moodStreak = 0) {

    const moodScores = Object.fromEntries(Dictionaries.AVAILABLE_MOODS.map(mood => [mood, 0.0]));
    const primaryEmotion = fingerprint?.primaryEmotion?.type || null;
    const originalMessage = safeStr(fingerprint?.originalMessage);

    // --- 1. التنعيم التكيفي مع التضاؤل ---
    let temporalFactor = BASE_SMOOTHING_FACTOR / (1 + (moodStreak * 0.5));
    if (primaryEmotion && lastMood !== EMOTION_TO_MOOD_MAP[primaryEmotion]) temporalFactor /= 2;
    if (lastMood && moodScores[lastMood] !== undefined) moodScores[lastMood] += temporalFactor;

    // --- 2. تعزيز المشاعر الأولية ---
    if (primaryEmotion && EMOTION_TO_MOOD_MAP[primaryEmotion]) {
        moodScores[EMOTION_TO_MOOD_MAP[primaryEmotion]] += 1.5;
    }

    // --- 3. نقاط المفاهيم مع حماية من undefined ---
    const conceptFrequencies = semanticMap?.frequencies?.concepts || {};
    for (const [concept, freq] of Object.entries(conceptFrequencies)) {
        const conceptData = Dictionaries.CONCEPT_DEFINITIONS[concept];
        if (conceptData?.mood_weights) {
            for (const [mood, weight] of Object.entries(conceptData.mood_weights)) {
                if (moodScores[mood] !== undefined) {
                    moodScores[mood] += weight * Math.log1p(freq);
                }
            }
        }
    }

    // --- 4. المعدلات السياقية المتقدمة مع حماية من undefined ---
    let intensityModifier = 1.0;
    const normalizedTokens = (semanticMap?.list?.allTokens || []).map(t => t.normalized);
    for (const token of normalizedTokens) {
        if (Dictionaries.INTENSIFIERS[token]) {
            intensityModifier += (Dictionaries.INTENSIFIERS[token] - 1.0) * 0.5;
        }
    }
    if (originalMessage.length > 150) intensityModifier += 0.1;
    if (originalMessage.includes('!!') || originalMessage.includes('؟؟')) intensityModifier += 0.2;

    for (const mood in moodScores) moodScores[mood] *= intensityModifier;

    // --- 5. Softmax ---
    const expScores = Object.values(moodScores).map(score => Math.exp(score));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probabilities = {};
    Object.keys(moodScores).forEach((mood, index) => {
        probabilities[mood] = sumExp > 0 ? expScores[index] / sumExp : 1 / Object.keys(moodScores).length;
    });

    // --- 6. اختيار الفائز والمزاج المركب ---
    const sortedMoods = Object.entries(probabilities).sort(([, a], [, b]) => b - a);
    const winnerMood = sortedMoods[0][0];
    const winnerProb = sortedMoods[0][1];
    const runnerUps = sortedMoods.slice(1).filter(([, prob]) => (winnerProb / prob) < 1.5 && prob > 0.1);
    let finalMood = winnerMood;
    let isComposite = false;
    if (runnerUps.length > 0) {
        finalMood += '+' + runnerUps.map(r => r[0]).join('+');
        isComposite = true;
    }
    const runnerUpProb = runnerUps.length > 0 ? runnerUps[0][1] : 0.0;
    const intensity = winnerProb - runnerUpProb;

    // --- 7. ضبط الثقة للدقة في الرسائل القصيرة ---
    let confidence = winnerProb;
    if (originalMessage.length < 20) confidence *= 0.7;

    if (Object.values(moodScores).every(s => s < 0.1)) {
        return { mood: 'supportive', confidence: 0.5, intensity: 0.5, distribution: probabilities, isComposite: false };
    }

    return { mood: finalMood, confidence, intensity, distribution: probabilities, isComposite };
}

