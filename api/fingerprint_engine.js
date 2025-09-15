// fingerprint_engine.js v1.0 - The Perceptual Lobe
// This engine's purpose is to perceive and understand the user's current state
// by reading the Knowledge Base and analyzing the immediate context.

import { DEBUG } from './config.js';
import { normalizeArabic } from './utils.js';
import { CONCEPTS_MAP, INTENSITY_MODIFIERS, MOTIVATIONAL_MAP } from './knowledge_base.js';

/**
 * Maps raw words from a message to their abstract concepts using the knowledge base.
 * @param {string} normalizedMessage - The normalized user message.
 * @returns {Set<string>} A set of unique concepts found in the message.
 */
function mapMessageToConcepts(normalizedMessage) {
    const tokens = new Set(normalizedMessage.split(/\s+/));
    const detectedConcepts = new Set();

    for (const concept in CONCEPTS_MAP) {
        const conceptData = CONCEPTS_MAP[concept];
        for (const word of conceptData.words) {
            if (tokens.has(normalizeArabic(word))) {
                detectedConcepts.add(concept);
                break; // Move to the next concept once one word from its family is found.
            }
        }
    }
    return detectedConcepts;
}

/**
 * Calculates the emotional intensity of a message by aggregating concept base intensities
 * and applying modifiers for emphasis words. (Implements User Idea #2)
 * @param {Set<string>} concepts - The set of concepts detected in the message.
 * @param {string} normalizedMessage - The normalized user message.
 * @returns {number} The final calculated intensity score.
 */
function calculateEmotionalIntensity(concepts, normalizedMessage) {
    if (concepts.size === 0) return 0.0;

    let totalBaseIntensity = 0;
    concepts.forEach(concept => {
        totalBaseIntensity += CONCEPTS_MAP[concept]?.intensity || 0;
    });
    
    // Average the base intensity of all detected concepts
    let intensity = totalBaseIntensity / concepts.size;

    // Apply modifiers for emphasis words
    const tokens = normalizedMessage.split(/\s+/);
    for (const token of tokens) {
        if (INTENSITY_MODIFIERS[token]) {
            intensity *= INTENSITY_MODIFIERS[token];
        }
    }
    
    // Apply modifier for punctuation (Implements User Idea from analysis)
    if (/[!؟]{2,}/.test(normalizedMessage)) {
        intensity *= 1.3;
    }

    return parseFloat(intensity.toFixed(2));
}

/**
 * Infers the primary psychological need from the detected concepts using the motivational map.
 * (Implements User Idea #1: Dynamic Emotion Blending in a simplified way)
 * @param {Set<string>} concepts - The set of concepts detected in the message.
 * @returns {string} The inferred primary need.
 */
function inferPrimaryNeed(concepts) {
    const needScores = {};
    let primaryNeed = 'general_support';

    // Vote for needs based on detected concepts
    concepts.forEach(concept => {
        for (const need in MOTIVATIONAL_MAP) {
            if (MOTIVATIONAL_MAP[need].includes(concept)) {
                needScores[need] = (needScores[need] || 0) + 1;
            }
        }
    });

    // Find the need with the highest score
    let maxScore = 0;
    for (const need in needScores) {
        if (needScores[need] > maxScore) {
            maxScore = needScores[need];
            primaryNeed = need;
        }
    }

    return primaryNeed;
}


/**
 * The main function of this engine. Deconstructs the user's message and the current
 * conversation state into a detailed, actionable psychological fingerprint.
 *
 * @param {string} rawMessage - The user's original message.
 * @param {object} contextState - The current state analyzed by the ContextTracker.
 * @returns {object} The complete Psychological Fingerprint.
 */
export function generateFingerprint(rawMessage, contextState) {
    const norm = normalizeArabic(rawMessage);
    const concepts = mapMessageToConcepts(norm);

    const primaryEmotionConcept = [...concepts].find(c => MOTIVATIONAL_MAP.safety_and_security?.includes(c) || MOTIVATIONAL_MAP.connection_and_belonging?.includes(c)) || 'neutral';
    
    const intensity = calculateEmotionalIntensity(concepts, norm);

    const fingerprint = {
        timestamp: new Date().toISOString(),
        originalMessage: rawMessage,
        concepts: [...concepts], // Convert Set to Array
        primaryEmotion: {
            type: primaryEmotionConcept,
            intensity: intensity
        },
        primaryNeed: inferPrimaryNeed(concepts),
        context: contextState // Embed the short-term memory analysis directly
    };

    if (DEBUG) console.log('🧠 Psychological Fingerprint Generated (vΩ):', fingerprint);
    
    return fingerprint;
}
