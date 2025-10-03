// intelligence/linguistic_core/summarizer/index.js
// Version 6.0: The Complete Psychological Profile Generator
// This module acts as the final orchestrator for the Summarizer layer.
// It calls all specialized analyzers and synthesizes their outputs into a single,
// comprehensive PsychologicalProfile object, ready for the Brain.

// We don't import tokenize here anymore, as it's now a pre-step.
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
export function createPsychologicalProfile(semanticMap, fingerprint, userState) {
    // This function now assumes semanticMap is already created and passed in.
    // This adheres to the single responsibility principle.

    // 1. Call the specialized experts, passing them the necessary data.
    
    // The Mood expert needs the map, fingerprint, and the user's state.
    const moodAnalysis = analyzeMood(semanticMap, fingerprint, userState);

    // The Tension expert needs the list of concepts.
    const narrativeTension = detectTension(semanticMap.allConcepts);
    
    // The Needs expert needs the map, fingerprint, and the detected tension.
    const needsAnalysis = analyzeNeeds(semanticMap, fingerprint, narrativeTension);

    // 2. Synthesize the final Psychological Profile from the experts' reports.
    const allConcepts = semanticMap.allConcepts;

    /** @type {PsychologicalProfile} */
    const profile = {
        allConcepts: allConcepts,
        dominantConcept: allConcepts[0] || null,
        
        // Mood analysis results
        mood: {
            primary: moodAnalysis.mood,
            confidence: moodAnalysis.confidence,
            intensity: moodAnalysis.intensity,
            distribution: moodAnalysis.distribution,
            isComposite: moodAnalysis.isComposite,
            _details: moodAnalysis.details // For debugging
        },

        // Tension analysis results
        narrativeTension: narrativeTension, // This is already a well-structured object or null

        // Needs analysis results
        implicitNeed: {
            dominant: needsAnalysis.dominant,
            scores: needsAnalysis.scores,
            _details: needsAnalysis.details // For debugging
        },
        
        // Pass the full map for deep access by the Brain if needed
        _rawSemanticMap: semanticMap 
    };

    // 3. Return both the created profile and the updated user state from the mood analyzer
    return {
        profile: profile,
        updatedUserState: moodAnalysis.updatedState,
    };
}
