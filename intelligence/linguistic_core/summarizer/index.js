
// intelligence/linguistic_core/summarizer/index.js
// Version 6.1: The Complete Psychological Profile Generator
// This module acts as the final orchestrator for the Summarizer layer.
// It calls all specialized analyzers and synthesizes their outputs into a single,
// comprehensive PsychologicalProfile object, ready for the Brain.

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
 * The main function of the Summarizer. Orchestrates all analyzers
 * to produce a complete Psychological Profile.
 * @param {import('../tokenizer/index.js').SemanticMap} semanticMap - The pre-generated semantic map.
 * @param {object} fingerprint - The legacy fingerprint object.
 * @param {object} userState - The complete user state object.
 * @returns {{profile: PsychologicalProfile, updatedUserState: object}} - The final profile and the updated user state.
 */
export function summarize(semanticMap, fingerprint, userState) {
    const moodAnalysis = analyzeMood(semanticMap, fingerprint, userState);
    const narrativeTension = detectTension(semanticMap.allConcepts);
    const needsAnalysis = analyzeNeeds(semanticMap, fingerprint, narrativeTension);

    const allConcepts = semanticMap.allConcepts;

    /** @type {PsychologicalProfile} */
    const profile = {
        allConcepts: allConcepts,
        dominantConcept: allConcepts[0] || null,

        mood: {
            primary: moodAnalysis.mood,
            confidence: moodAnalysis.confidence,
            intensity: moodAnalysis.intensity,
            distribution: moodAnalysis.distribution,
            isComposite: moodAnalysis.isComposite,
            _details: moodAnalysis.details
        },

        narrativeTension: narrativeTension,

        implicitNeed: {
            dominant: needsAnalysis.dominant,
            scores: needsAnalysis.scores,
            _details: needsAnalysis.details
        },

        _rawSemanticMap: semanticMap
    };

    return {
        profile: profile,
        updatedUserState: moodAnalysis.updatedState,
    };
}

