// intelligence/linguistic_core/summarizer/needs_analyzer.js
// Version 2.0: Enhanced Signal Processing
// This version refines the scoring logic, adds new signals from the Narrative Tensions,
// and ensures a more robust and nuanced need inference.

import Dictionaries from '../dictionaries/index.js'; // Use the central hub

/**
 * The primary function for inferring the user's core psychological need for the current turn.
 * @param {import('../tokenizer/index.js').SemanticMap} semanticMap - The rich semantic map from the tokenizer.
 * @param {object} fingerprint - The legacy fingerprint object for additional context.
 * @param {import('./tension_detector.js').NarrativeTension | null} narrativeTension - The detected narrative tension (can be null).
 * @returns {{dominant: string, scores: Object.<string, number>, details: string[]}} The detailed need analysis result.
 */
export function analyzeNeeds(semanticMap, fingerprint, narrativeTension) {
    const needScores = {
        validation: 0.0,   // Need to be heard and understood ("I see you")
        guidance: 0.0,     // Need for practical steps ("Tell me what to do")
        clarity: 0.0,      // Need for insight and self-understanding ("Help me understand myself")
        support: 0.5,      // Default need for general presence ("Be with me")
    };
    const details = ['Base support score: +0.5']; // For debugging

    // Guard clause for invalid inputs
    if (!semanticMap || !fingerprint) {
        return { dominant: 'support', scores: needScores, details: ['Error: Invalid input'] };
    }

    // 1. Analyze Communication Style (from legacy fingerprint) - Strongest signal
    const { communicationStyle, intensity, originalMessage = '' } = fingerprint;
    if (communicationStyle === 'venting') {
        needScores.validation += 1.5;
        details.push('+1.5 from style: venting -> validation');
    } else if (communicationStyle === 'seeking_advice' || originalMessage.includes('?')) {
        needScores.guidance += 1.5;
        details.push('+1.5 from style: seeking_advice/? -> guidance');
    } else if (communicationStyle === 'story_telling') {
        needScores.clarity += 1.2;
        needScores.validation += 0.5;
        details.push('+1.2 from style: story_telling -> clarity');
        details.push('+0.5 from style: story_telling -> validation');
    }

    // 2. Analyze Concept Tags (from new SemanticMap)
    const { allConcepts } = semanticMap;
    if (allConcepts && allConcepts.length > 0) {
        const tagCounts = { feeling: 0, action: 0, 'problem-solving': 0, 'self-criticism': 0 };
        for (const concept of allConcepts) {
            const definition = Dictionaries.CONCEPT_DEFINITIONS[concept];
            if (definition?.tags) {
                definition.tags.forEach(tag => {
                    if (tagCounts.hasOwnProperty(tag)) {
                        tagCounts[tag]++;
                    }
                });
            }
        }
        
        if (tagCounts.feeling > tagCounts.action) {
            const score = 1.0 * (tagCounts.feeling / allConcepts.length);
            needScores.validation += score;
            details.push(`+${score.toFixed(2)} from concept ratio (feeling-heavy) -> validation`);
        }
        if (tagCounts.action > tagCounts.feeling || tagCounts['problem-solving'] > 0) {
            const score = 1.0 * (tagCounts.action / allConcepts.length);
            needScores.guidance += score;
            details.push(`+${score.toFixed(2)} from concept ratio (action-heavy) -> guidance`);
        }
        if (tagCounts['self-criticism'] > 0) {
            const score = 1.2 * (tagCounts['self-criticism'] / allConcepts.length);
            needScores.clarity += score; // Self-criticism often needs clarity/insight
            needScores.validation += score * 0.5; // and validation
            details.push(`+${score.toFixed(2)} from self-criticism concepts -> clarity`);
        }
    }
    
    // 3. Analyze Emotional Intensity (from legacy fingerprint)
    if (intensity && intensity > 0.8) {
        needScores.support += 1.0;
        needScores.validation += 0.8;
        details.push(`+1.0 from high intensity -> support`);
        details.push(`+0.8 from high intensity -> validation`);
    }

    // 4. [NEW SIGNAL] Analyze Narrative Tension
    if (narrativeTension) {
        // If there's a conflict, the user likely needs help understanding it
        needScores.clarity += 1.2;
        details.push(`+1.2 from detected tension '${narrativeTension.tension_id}' -> clarity`);
    }

    // 5. Determine the dominant need
    let dominantNeed = 'support';
    let maxScore = 0;
    for (const need in needScores) {
        if (needScores[need] > maxScore) {
            maxScore = needScores[need];
            dominantNeed = need;
        }
    }
    
    //console.log("[NeedsAnalyzer] Final Scores:", needScores);
    return {
        dominant: dominantNeed,
        scores: needScores,
        details: details
    };
}
