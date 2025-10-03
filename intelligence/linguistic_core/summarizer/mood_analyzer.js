// intelligence/linguistic_core/summarizer/mood_analyzer.js
// Version 9.0: Integrated Temporal Mood Model
// This version merges the powerful temporal and dynamic blending logic from the original
// engine with the rich, structured data from the new SemanticMap, creating a highly
// accurate and context-aware mood analysis powerhouse.

import Dictionaries from '../dictionaries/index.js';

const TEMPORAL_WINDOW = 5; // Number of turns to keep in mood history.

/**
 * Analyzes the complete context to produce an advanced, time-aware mood map.
 * @param {import('../tokenizer/index.js').SemanticMap} semanticMap
 * @param {object} fingerprint
 * @param {object} userState - The complete user state object containing history.
 * @returns {object} The fully developed mood profile { mood, confidence, ... }.
 */
export function analyzeMood(semanticMap, fingerprint = {}, userState = {}) {
    // --- 1. Initialization & State Management ---
    const moodScores = Object.fromEntries(Dictionaries.AVAILABLE_MOODS.map(mood => [mood, 0.0]));
    const details = []; // For debugging and transparency

    // Safely initialize user state for mood analysis
    const moodHistory = userState.moodHistory || [];
    const lastMoodProfile = moodHistory.length > 0 ? moodHistory[moodHistory.length - 1] : null;

    // --- 2. Temporal Smoothing (Based on previous turn) ---
    if (lastMoodProfile) {
        // Give a small boost to all moods from the previous turn, encouraging stability.
        for (const mood in lastMoodProfile) {
            if (moodScores.hasOwnProperty(mood)) {
                moodScores[mood] += lastMoodProfile[mood] * 0.25; // Smoothing factor
            }
        }
        details.push(`Applied temporal smoothing from last turn.`);
    }

    // --- 3. Score Accumulation from SemanticMap ---
    // A. From Concepts
    for (const [concept, freq] of Object.entries(semanticMap.conceptFrequency)) {
        const definition = Dictionaries.CONCEPT_DEFINITIONS[concept];
        if (definition?.mood_weights) {
            for (const [mood, weight] of Object.entries(definition.mood_weights)) {
                if (moodScores.hasOwnProperty(mood)) {
                    // Use Math.log1p(freq) to reduce the impact of very high frequency words
                    const score = weight * Math.log1p(freq);
                    moodScores[mood] += score;
                    details.push(`+${score.toFixed(2)} from concept '${concept}' -> ${mood}`);
                }
            }
        }
    }

    // B. From Anchors and Intensifiers
    let intensityModifier = 1.0;
    for (let i = 0; i < semanticMap.tokens.length; i++) {
        const token = semanticMap.tokens[i];
        const normalizedToken = token.normalized;

        // Handle Intensifiers by boosting the overall intensity
        const intensifier = Dictionaries.INTENSIFIERS[normalizedToken];
        if (intensifier) {
            intensityModifier += (intensifier.multiplier - 1.0); // Add the bonus factor
            details.push(`Intensity modifier boosted by '${normalizedToken}'`);
        }
        
        // Handle Anchors by adding a strong, direct score
        const anchor = Dictionaries.ANCHOR_MOODS[normalizedToken];
        if (anchor?.mood_weights) {
            for (const [mood, weight] of Object.entries(anchor.mood_weights)) {
                if (moodScores.hasOwnProperty(mood)) {
                    moodScores[mood] += weight; // Anchors have a strong, direct effect
                    details.push(`+${weight.toFixed(2)} from anchor '${normalizedToken}' -> ${mood}`);
                }
            }
        }
    }
    
    // Apply the final intensity modifier to all scores
    if(intensityModifier > 1.0){
        for (const mood in moodScores) {
            if(moodScores[mood] > 0) moodScores[mood] *= intensityModifier;
        }
        details.push(`Applied final intensity modifier of x${intensityModifier.toFixed(2)}`);
    }


    // --- 4. Normalization using Softmax ---
    const expScores = Object.values(moodScores).map(score => Math.exp(score));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probabilities = {};
    Object.keys(moodScores).forEach((mood, index) => {
        probabilities[mood] = sumExp > 0 ? expScores[index] / sumExp : 1 / Object.keys(moodScores).length;
    });

    // --- 5. Dynamic Blending & Winner Selection ---
    const sortedMoods = Object.entries(probabilities).sort(([, a], [, b]) => b - a);
    const winnerMood = sortedMoods[0][0];
    const winnerProb = sortedMoods[0][1];
    let finalMood = winnerMood;
    let isComposite = false;

    if (sortedMoods.length > 1) {
        const runnerUpProb = sortedMoods[1][1];
        // If the winner is not dominant enough, create a composite mood.
        if (winnerProb / runnerUpProb < 1.8) {
            finalMood = sortedMoods
                .filter(([, p]) => p > 0.15) // Filter out weak signals
                .map(([m, p]) => `${m}:${(p * 100).toFixed(0)}%`)
                .join('|');
            isComposite = finalMood.includes('|');
        }
    }

    // --- 6. Confidence Calculation ---
    let confidence = winnerProb;
    if (semanticMap.tokens.length < 3) confidence *= 0.7; // Lower confidence for very short messages
    if (semanticMap.allConcepts.length === 0) confidence *= 0.8; // Lower confidence if no concepts were found

    // --- 7. Update User State History ---
    moodHistory.push(probabilities);
    if (moodHistory.length > TEMPORAL_WINDOW) moodHistory.shift();

    // The returned object now contains the updated history, to be saved by the caller
    const updatedState = { ...userState, moodHistory };

    // Final check for a near-zero result
    if (Object.values(moodScores).every(s => s < 0.1)) {
        return {
            mood: 'supportive', confidence: 0.5,
            distribution: probabilities, isComposite: false, details, updatedState
        };
    }
    
    return {
        mood: finalMood,
        confidence: parseFloat(confidence.toFixed(2)),
        intensity: parseFloat(winnerProb.toFixed(2)),
        distribution: probabilities,
        isComposite,
        details,
        updatedState // Pass the updated state back
    };
}
