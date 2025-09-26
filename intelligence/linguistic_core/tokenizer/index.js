// intelligence/linguistic_core/tokenizer/index.js
// Version 5.0: The Semantic Understanding Engine
// This version evolves from a tokenizer into a true NLU engine by:
// 1. Implementing advanced morphological analysis (stemming with more affixes).
// 2. Supporting multi-concept mapping for richer semantics.
// 3. Outputting a structured SemanticMap object with comprehensive stats.

import { Dictionaries } from '../dictionaries/index.js';
import { safeStr } from '../utils.js';

// =================================================================
// SECTION 1: ADVANCED LINGUISTIC PROCESSING ENGINES
// =================================================================

function normalize(text) {
    return text
        .replace(/[\u064B-\u0652]/g, "")
        .replace(/[إأآا]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/[ؤ]/g, "و")
        .replace(/[ئ]/g, "ي")
        .replace(/ة/g, "ه");
}

function stem(token) {
    let currentToken = token;
    // 1. Remove prefixes
    for (const pre of Dictionaries.PREFIXES) {
        if (currentToken.startsWith(pre) && currentToken.length > pre.length + 2) {
            currentToken = currentToken.slice(pre.length);
            break; 
        }
    }
    // 2. Remove suffixes
    for (const suf of Dictionaries.SUFFIXES) {
        if (currentToken.endsWith(suf) && currentToken.length > suf.length + 2) {
            currentToken = currentToken.slice(0, -suf.length);
            break;
        }
    }
    return currentToken;
}

// =================================================================
// SECTION 2: SEMANTIC ANALYSIS ENGINE
// =================================================================

function analyzeToken(rawToken) {
    const normalized = normalize(safeStr(rawToken).toLowerCase());
    
    if (Dictionaries.STOP_WORDS.includes(normalized) || normalized.length < 2) {
        return null; // This is a stopword or insignificant token
    }

    const stem_ = stem(normalized);
    let concepts = [];
    
    const staticConcepts = Dictionaries.CONCEPT_MAP[stem_] || Dictionaries.CONCEPT_MAP[normalized];
    if (staticConcepts) {
        // Ensure it's always an array and add to our concepts list
        concepts.push(...(Array.isArray(staticConcepts) ? staticConcepts : [staticConcepts]));
    }
    
    const result = {
        original: rawToken,
        normalized: normalized,
        stem: stem_,
        tag: concepts.length > 0 ? 'concept' : 'normal',
        concepts: uniq(concepts) // Return unique concepts
    };

    // console.log(`[Tokenizer:analyzeToken] Raw: '${rawToken}' -> Stem: '${result.stem}', Concepts: [${result.concepts.join(', ')}]`);
    return result;
}

// =================================================================
// SECTION 3: THE SEMANTIC MAP GENERATOR API
// =================================================================

/**
 * The main exported function. Transforms raw text into a rich SemanticMap.
 * @param {string} text The raw user input.
 * @returns {object} The comprehensive SemanticMap object.
 */
export function tokenize(text) {
    console.log(`\n--- [Tokenizer ENTRY] ---`);
    console.log(`[Tokenizer] Received text: "${text ? text.slice(0, 50) : 'empty'}..."`);

    // Standardized output object
    const semanticMap = {
        sentences: [],
        tokens: [], // This will hold the rich token objects per sentence
        list: {
            allTokens: [],
            uniqueStems: [],
            allConcepts: []
        },
        frequencies: {
            stems: {},
            concepts: {}
        },
        stats: {
            sentenceCount: 0,
            tokenCount: 0,
            uniqueStemCount: 0,
            conceptCount: 0,
        }
    };

    if (!text) {
        console.log("[Tokenizer] EXIT: Empty text provided.");
        return semanticMap;
    }

    const sentences = safeStr(text).split(/(?<=[.؟!?])\s+/);
    semanticMap.stats.sentenceCount = sentences.length;
    console.log(`[Tokenizer] Split into ${sentences.length} sentence(s).`);

    const stemFrequency = new Map();
    const conceptFrequency = new Map();

    for (const sentence of sentences) {
        const sentenceTokens = [];
        const rawTokens = sentence.split(/\s+/);

        for (const rawToken of rawTokens) {
            const analyzedToken = analyzeToken(rawToken);
            if (analyzedToken) { // Ignore stopwords and empty tokens
                sentenceTokens.push(analyzedToken);

                // Update frequencies
                const stemKey = analyzedToken.stem;
                stemFrequency.set(stemKey, (stemFrequency.get(stemKey) || 0) + 1);

                if (analyzedToken.concepts.length > 0) {
                    analyzedToken.concepts.forEach(concept => {
                        conceptFrequency.set(concept, (conceptFrequency.get(concept) || 0) + 1);
                    });
                }
            }
        }
        semanticMap.tokens.push(sentenceTokens);
    }
    
    // Populate the final SemanticMap object
    const allAnalyzedTokens = semanticMap.tokens.flat();
    semanticMap.stats.tokenCount = allAnalyzedTokens.length;

    semanticMap.list.allTokens = allAnalyzedTokens;
    semanticMap.list.uniqueStems = Array.from(stemFrequency.keys());
    semanticMap.list.allConcepts = Array.from(conceptFrequency.keys());

    semanticMap.frequencies.stems = Object.fromEntries(stemFrequency);
    semanticMap.frequencies.concepts = Object.fromEntries(conceptFrequency);
    
    semanticMap.stats.uniqueStemCount = semanticMap.list.uniqueStems.length;
    semanticMap.stats.conceptCount = semanticMap.list.allConcepts.length;

    console.log(`[Tokenizer] Analysis Complete. Concepts found: [${semanticMap.list.allConcepts.join(', ')}].`);
    console.log(`[Tokenizer] Final Stats:`, semanticMap.stats);
    console.log(`--- [Tokenizer EXIT] ---\n`);
    
    return semanticMap;
}

// Helper function to get unique elements from an array
function uniq(arr) {
    return [...new Set(arr)];
}
