// intelligence/linguistic_core/summarizer/tension_detector.js
// Version 2.0: Advanced Pole-Based Tension Detection
// This version utilizes the advanced pole-based structure (pole_a_concepts, pole_b_concepts)
// from the patterns dictionary, allowing for more flexible and accurate detection of psychological conflicts.

import Dictionaries from '../dictionaries/index.js';

/**
 * @typedef {Object} DetectedTension
 * @property {string} tension_id - The ID of the detected tension rule.
 * @property {string} description - The description of the conflict.
 * @property {string} pole_a_trigger - The specific concept that triggered pole A.
 * @property {string} pole_b_trigger - The specific concept that triggered pole B.
 */

/**
 * Analyzes a list of concepts to find underlying psychological conflicts (narrative tensions).
 * It checks if at least one concept from pole A and one from pole B of a tension rule are present.
 * @param {string[]} detectedConcepts - A unique list of all concepts found in the user's message.
 * @returns {DetectedTension | null} An object describing the first and strongest detected tension, or null if none are found.
 */
export function detectTension(detectedConcepts) {
    if (!detectedConcepts || detectedConcepts.length < 2) {
        return null; // A tension requires at least two opposing concepts.
    }

    const conceptSet = new Set(detectedConcepts);

    // Iterate through all the tension rules in our dictionary
    for (const tensionRule of Dictionaries.NARRATIVE_TENSIONS) {
        let pole_a_match = null;
        let pole_b_match = null;

        // Check for a match in Pole A
        for (const concept of tensionRule.pole_a_concepts) {
            if (conceptSet.has(concept)) {
                pole_a_match = concept;
                break; // Found a match, no need to check other concepts in this pole
            }
        }

        // If a match was found in Pole A, check for a match in Pole B
        if (pole_a_match) {
            for (const concept of tensionRule.pole_b_concepts) {
                if (conceptSet.has(concept)) {
                    pole_b_match = concept;
                    break; // Found a match, no need to check other concepts in this pole
                }
            }
        }

        // If we found a match in BOTH poles, we have detected a tension!
        if (pole_a_match && pole_b_match) {
            // We found a tension. Return it immediately.
            // The order in patterns.js can act as a priority list.
            return {
                tension_id: tensionRule.tension_id,
                description: tensionRule.description,
                pole_a_trigger: pole_a_match,
                pole_b_trigger: pole_b_match,
            };
        }
    }

    // If we loop through all rules and find nothing, return null.
    return null;
}
