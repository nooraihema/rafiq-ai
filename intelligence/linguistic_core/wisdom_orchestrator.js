// intelligence/linguistic_core/wisdom_orchestrator.js
// Version 2.0: Advanced Strategic Orchestrator
// Incorporates intelligent library filtering, a richer gem scoring model (including mood and history),
// and a structured WisdomPack output for the Brain.

const LIBRARY_FILTER_THRESHOLD = 0.3; // Minimum relevance score for a library to be considered.

const WEIGHTS = {
    // Library Scoring Weights
    CONCEPT_MATCH_LIB: 1.0,
    TENSION_MATCH_LIB: 1.5,
    NEED_MATCH_LIB: 1.2,
    
    // Gem Scoring Weights
    APPLICABILITY_CONCEPT: 1.2,
    APPLICABILITY_TENSION: 1.8,
    APPLICABILITY_NEED: 1.5,
    MOOD_ALIGNMENT: 1.4,
    HISTORY_PENALTY: -2.0, // Strong penalty to avoid immediate repetition
};

/**
 * @typedef {Object} ScoredGem
 * // ... (same as before)
 */

/**
 * @typedef {Object} WisdomPack
 * @property {ScoredGem[]} primary - The top 1-3 most relevant gems.
 * @property {ScoredGem[]} supporting - Other relevant gems to enrich the response.
 * @property {string} top_category - The most needed category of response.
 * @property {object[]} _debug_library_scores - Scores of all considered libraries.
 */

/**
 * Orchestrates the selection and scoring of wisdom gems.
 * @param {import('./summarizer/index.js').PsychologicalProfile} psychologicalProfile
 * @param {object[]} allWisdomLibraries
 * @param {string[]} recentGemIds - An array of gem_ids used recently in the conversation.
 * @returns {WisdomPack} The final, structured WisdomPack.
 */
export function orchestrateWisdom(psychologicalProfile, allWisdomLibraries, recentGemIds = []) {
    const scoredGems = [];
    const categoryScores = {};

    // 1. [UPGRADED] Intelligently filter for relevant libraries
    const { relevantLibraries, libraryScores } = filterLibraries(psychologicalProfile, allWisdomLibraries);

    // 2. Iterate through each relevant library to extract and score its gems
    for (const library of relevantLibraries) {
        if (!library.gems_bank) continue;

        for (const category in library.gems_bank) {
            if (!Array.isArray(library.gems_bank[category])) continue;
            if (!categoryScores[category]) categoryScores[category] = 0;

            for (const gem of library.gems_bank[category]) {
                const { score, details } = scoreGem(gem, psychologicalProfile, recentGemIds);
                
                if (score > 0.5) { // Threshold to include a gem
                    scoredGems.push({
                        gem_id: gem.gem_id,
                        content: gem.content,
                        category: category,
                        source_library: library.tag,
                        score: parseFloat(score.toFixed(2)),
                        score_details: details,
                    });
                    categoryScores[category] += score;
                }
            }
        }
    }

    // 3. Sort gems by score
    scoredGems.sort((a, b) => b.score - a.score);

    // 4. [UPGRADED] Structure the output into a WisdomPack
    const primaryGems = scoredGems.slice(0, 3);
    const supportingGems = scoredGems.slice(3, 10); // Get the next 7

    const topCategory = Object.keys(categoryScores).length > 0
        ? Object.entries(categoryScores).sort((a, b) => b[1] - a[1])[0][0]
        : 'validation';

    /** @type {WisdomPack} */
    return {
        primary: primaryGems,
        supporting: supportingGems,
        top_category: topCategory,
        _debug_library_scores: libraryScores,
    };
}

/**
 * [UPGRADED] Scores a single gem with a richer model.
 * @param {object} gem
 * @param {import('./summarizer/index.js').PsychologicalProfile} profile
 * @param {string[]} recentGemIds
 * @returns {{score: number, details: string[]}}
 */
function scoreGem(gem, profile, recentGemIds) {
    let score = 1.0;
    const details = ['Base score: 1.0'];
    
    const applicability = gem.applicability || {};
    const { concepts, tensions, needs, mood_tag } = applicability;

    // A. Score from applicability rules
    if (concepts && profile.allConcepts) {
        const matchCount = concepts.filter(c => profile.allConcepts.includes(c)).length;
        if (matchCount > 0) {
            const bonus = matchCount * WEIGHTS.APPLICABILITY_CONCEPT;
            score += bonus;
            details.push(`+${bonus.toFixed(2)} from ${matchCount} concept match(es)`);
        }
    }
    if (tensions && profile.narrativeTension && tensions.includes(profile.narrativeTension.tension_id)) {
        score += WEIGHTS.APPLICABILITY_TENSION;
        details.push(`+${WEIGHTS.APPLICABILITY_TENSION.toFixed(2)} from tension match`);
    }
    if (needs && profile.implicitNeed && needs.includes(profile.implicitNeed.dominant)) {
        score += WEIGHTS.APPLICABILITY_NEED;
        details.push(`+${WEIGHTS.APPLICABILITY_NEED.toFixed(2)} from need match`);
    }

    // B. [NEW] Score from mood alignment
    if (mood_tag && profile.mood && mood_tag === profile.mood.primary) {
        score += WEIGHTS.MOOD_ALIGNMENT;
        details.push(`+${WEIGHTS.MOOD_ALIGNMENT.toFixed(2)} for mood alignment with '${profile.mood.primary}'`);
    }

    // C. [NEW] Penalty for recent repetition
    if (recentGemIds.includes(gem.gem_id)) {
        score += WEIGHTS.HISTORY_PENALTY;
        details.push(`${WEIGHTS.HISTORY_PENALTY.toFixed(2)} penalty for recent repetition`);
    }
    
    // Ensure score doesn't go below zero
    return { score: Math.max(0, score), details };
}

/**
 * [UPGRADED] Intelligently filters and scores libraries based on relevance.
 * @param {import('./summarizer/index.js').PsychologicalProfile} profile
 * @param {object[]} allLibraries
 * @returns {{relevantLibraries: object[], libraryScores: object[]}}
 */
function filterLibraries(profile, allLibraries) {
    const libraryScores = [];

    for (const library of allLibraries) {
        let score = 0.0;
        const triggers = library.wisdom_map?.triggers;
        if (!triggers) continue;

        // Score based on concepts
        if (triggers.concepts && profile.allConcepts) {
            const profileConcepts = new Set(profile.allConcepts);
            const matchCount = triggers.concepts.filter(c => profileConcepts.has(c.name)).length;
            score += matchCount * WEIGHTS.CONCEPT_MATCH_LIB;
        }

        // Score based on tensions
        if (triggers.tensions && profile.narrativeTension) {
            const profileTensionId = profile.narrativeTension.tension_id;
            const match = triggers.tensions.find(t => t.name === profileTensionId);
            if (match) {
                score += (match.weight || 1.0) * WEIGHTS.TENSION_MATCH_LIB;
            }
        }
        
        // Score based on needs
        if (triggers.needs && profile.implicitNeed) {
            const profileNeed = profile.implicitNeed.dominant;
            const match = triggers.needs.find(n => n.name === profileNeed);
            if (match) {
                score += (match.weight || 1.0) * WEIGHTS.NEED_MATCH_LIB;
            }
        }

        libraryScores.push({ tag: library.tag, score: score });
    }

    // Filter libraries that meet the minimum score threshold
    const relevantLibraryTags = libraryScores
        .filter(lib => lib.score >= LIBRARY_FILTER_THRESHOLD)
        .map(lib => lib.tag);
        
    const relevantLibraries = allLibraries.filter(lib => relevantLibraryTags.includes(lib.tag));

    return { relevantLibraries, libraryScores };
}
