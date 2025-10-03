// intelligence/linguistic_core/tokenizer/index.js
// Version 6.0: The Semantic Understanding Engine
// This version refines the output into a standardized SemanticMap, improves
// efficiency, and lays the groundwork for future n-gram analysis.

import Dictionaries from '../dictionaries/index.js'; // Import the central hub
import { safeStr } from '../utils.js';

// =================================================================
// SECTION 1: LINGUISTIC NORMALIZATION & STEMMING
// =================================================================

/** Normalizes Arabic text for consistent processing. */
function normalize(text) {
    return text
        .replace(/[\u064B-\u0652]/g, "") // Remove harakat
        .replace(/[إأآا]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/[ؤ]/g, "و")
        .replace(/[ئ]/g, "ي")
        .replace(/ة/g, "ه");
}

/** A simple rule-based stemmer for Arabic. */
function stem(token) {
    let currentToken = token;
    for (const pre of Dictionaries.PREFIXES) {
        if (currentToken.startsWith(pre) && currentToken.length > pre.length + 2) {
            currentToken = currentToken.slice(pre.length);
            break; 
        }
    }
    for (const suf of Dictionaries.SUFFIXES) {
        if (currentToken.endsWith(suf) && currentToken.length > suf.length + 2) {
            currentToken = currentToken.slice(0, -suf.length);
            break;
        }
    }
    return currentToken;
}


// =================================================================
// SECTION 2: THE SEMANTIC MAP GENERATOR API
// =================================================================

/**
 * @typedef {Object} AnalyzedToken
 * @property {string} original - The original word from the text.
 * @property {string} normalized - The normalized form of the word.
 * @property {string} stem - The stemmed form of the word.
 * @property {string[]} concepts - An array of concept IDs linked to this token.
 */

/**
 * @typedef {Object} SemanticMap
 * @property {string} rawText - The original input text.
 * @property {AnalyzedToken[]} tokens - A flat array of all analyzed tokens (excluding stopwords).
 * @property {string[]} allConcepts - A flat array of all unique concepts found in the text.
 * @property {Object.<string, number>} conceptFrequency - A map of concepts to their frequencies.
 * @property {Object.<string, number>} stemFrequency - A map of stems to their frequencies.
 * @property {{tokenCount: number, conceptCount: number, uniqueConceptCount: number}} stats - Key statistics.
 */

/**
 * The main exported function. Transforms raw text into a rich SemanticMap.
 * @param {string} text The raw user input.
 * @returns {SemanticMap} The comprehensive SemanticMap object.
 */
export function createSemanticMap(text) {
    const rawText = safeStr(text);
    const initialTokens = rawText.split(/[\s،.]+/).filter(Boolean);

    const analyzedTokens = [];
    const conceptFrequency = new Map();
    const stemFrequency = new Map();

    for (let i = 0; i < initialTokens.length; i++) {
        const rawToken = initialTokens[i];
        const normalized = normalize(rawToken.toLowerCase());
        
        if (Dictionaries.STOP_WORDS.includes(normalized) || normalized.length < 2) {
            continue;
        }

        const stem_ = stem(normalized);
        let concepts = [];
        
        // Check for multi-word concepts first (bigrams)
        if (i + 1 < initialTokens.length) {
            const bigram = `${normalized} ${normalize(initialTokens[i+1].toLowerCase())}`;
            const bigramStem = `${stem_} ${stem(normalize(initialTokens[i+1].toLowerCase()))}`;
            const bigramConcepts = Dictionaries.CONCEPT_MAP[bigram] || Dictionaries.CONCEPT_MAP[bigramStem];
            if (bigramConcepts) {
                concepts.push(...bigramConcepts);
                i++; // Skip the next token as it has been processed
            }
        }

        // If no bigram was found, check for single word concepts
        if (concepts.length === 0) {
            const staticConcepts = Dictionaries.CONCEPT_MAP[stem_] || Dictionaries.CONCEPT_MAP[normalized];
            if (staticConcepts) {
                concepts.push(...(Array.isArray(staticConcepts) ? staticConcepts : [staticConcepts]));
            }
        }

        const tokenData = {
            original: rawToken,
            normalized: normalized,
            stem: stem_,
            concepts: [...new Set(concepts)] // Ensure uniqueness
        };
        
        analyzedTokens.push(tokenData);

        // Update frequencies
        stemFrequency.set(stem_, (stemFrequency.get(stem_) || 0) + 1);
        tokenData.concepts.forEach(concept => {
            conceptFrequency.set(concept, (conceptFrequency.get(concept) || 0) + 1);
        });
    }

    const allUniqueConcepts = Array.from(conceptFrequency.keys());
    
    /** @type {SemanticMap} */
    const semanticMap = {
        rawText: rawText,
        tokens: analyzedTokens,
        allConcepts: allUniqueConcepts,
        conceptFrequency: Object.fromEntries(conceptFrequency),
        stemFrequency: Object.fromEntries(stemFrequency),
        stats: {
            tokenCount: analyzedTokens.length,
            conceptCount: allUniqueConcepts.length > 0 ? allUniqueConcepts.map(c => conceptFrequency.get(c)).reduce((a, b) => a + b, 0) : 0,
            uniqueConceptCount: allUniqueConcepts.length,
        }
    };
    
    return semanticMap;
}
