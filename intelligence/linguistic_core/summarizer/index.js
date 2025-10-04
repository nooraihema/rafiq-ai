
// intelligence/linguistic_core/summarizer/index.js
// Version 6.2: The Complete Psychological Profile Generator
// Supports both summarize + createPsychologicalProfile for compatibility.

import { analyzeMood } from './mood_analyzer.js';
import { detectTension } from './tension_detector.js';
import { analyzeNeeds } from './needs_analyzer.js';

/**
 * @typedef {Object} PsychologicalProfile
 * @property {string[]} allConcepts
 * @property {string|null} dominantConcept
 * @property {object} mood
 * @property {object|null} narrativeTension
 * @property {object} implicitNeed
 * @property {import('../tokenizer/index.js').SemanticMap} _rawSemanticMap
 */

/**
 * Orchestrates all analyzers to produce a complete Psychological Profile.
 * @param {import('../tokenizer/index.js').SemanticMap} semanticMap
 * @param {object} fingerprint
 * @param {object} userState
 * @returns {{profile: PsychologicalProfile, updatedUserState: object}}
 */
function generateProfile(semanticMap, fingerprint, userState) {
    const moodAnalysis = analyzeMood(semanticMap, fingerprint, userState);
    const narrativeTension = detectTension(semanticMap.allConcepts);
    const needsAnalysis = analyzeNeeds(semanticMap, fingerprint, narrativeTension);

    const allConcepts = semanticMap.allConcepts;

    /** @type {PsychologicalProfile} */
    const profile = {
        allConcepts,
        dominantConcept: allConcepts[0] || null,

        mood: {
            primary: moodAnalysis.mood,
            confidence: moodAnalysis.confidence,
            intensity: moodAnalysis.intensity,
            distribution: moodAnalysis.distribution,
            isComposite: moodAnalysis.isComposite,
            _details: moodAnalysis.details
        },

        narrativeTension,

        implicitNeed: {
            dominant: needsAnalysis.dominant,
            scores: needsAnalysis.scores,
            _details: needsAnalysis.details
        },

        _rawSemanticMap: semanticMap
    };

    return {
        profile,
        updatedUserState: moodAnalysis.updatedState,
    };
}

// ✅ Export with both names for backward compatibility
export const summarize = generateProfile;
export const createPsychologicalProfile = generateProfile;


