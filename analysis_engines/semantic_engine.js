// /analysis_engines/semantic_engine.js
// Semantic Engine v2.0 - The Deep Semantic Engine
// This version introduces advanced morphological and semantic analysis
// to understand implicit concepts and leverage the full power of the dictionaries.

import { normalizeArabic, tokenize, generateNgrams } from '../core/utils.js';

export class SemanticEngine {
    constructor(dictionaries) {
        if (!dictionaries || !dictionaries.CONCEPT_MAP || !dictionaries.AFFIX_DICTIONARY || !dictionaries.STOP_WORDS_SET || !dictionaries.EMOTIONAL_ANCHORS_DICTIONARY) {
            throw new Error("SemanticEngine v2.0 requires comprehensive dictionaries: CONCEPT_MAP, AFFIX_DICTIONARY, STOP_WORDS_SET, EMOTIONAL_ANCHORS_DICTIONARY.");
        }
        this.conceptMap = dictionaries.CONCEPT_MAP;
        this.affixes = dictionaries.AFFIX_DICTIONARY;
        this.stopWords = dictionaries.STOP_WORDS_SET;
        this.emotionalAnchors = dictionaries.EMOTIONAL_ANCHORS_DICTIONARY;

        // Build a reverse map from roots to their corresponding emotional anchors for deep analysis
        this.rootToAnchorMap = this._buildRootToAnchorMap();

        // For performance, pre-process and sort prefixes and suffixes for the stemmer
        this.prefixes = (this.affixes.prefixes || []).map(p => p.value).sort((a, b) => b.length - a.length);
        this.suffixes = (this.affixes.suffixes || []).map(s => s.value).sort((a, b) => b.length - a.length);
    }

    /**
     * Builds a map from a linguistic root to its associated emotional anchor data.
     * This allows for semantic inference when a direct concept match is not found.
     * @private
     */
    _buildRootToAnchorMap() {
        const map = new Map();
        for (const [word, anchorData] of Object.entries(this.emotionalAnchors)) {
            if (anchorData.root) {
                if (!map.has(anchorData.root)) {
                    map.set(anchorData.root, []);
                }
                map.get(anchorData.root).push({ word, ...anchorData });
            }
        }
        return map;
    }

    /**
     * An advanced stemming utility that generates multiple possible stems for a token.
     * @private
     */
    _deepStem(token) {
        let stems = new Set([token]);
        let currentToken = token;

        // Try stripping prefixes
        for (const pre of this.prefixes) {
            if (currentToken.startsWith(pre) && currentToken.length > pre.length + 2) {
                stems.add(currentToken.slice(pre.length));
            }
        }

        // Try stripping suffixes from the original token and all generated prefixed stems
        const stemsWithSuffixes = [...stems];
        for (const stem of stemsWithSuffixes) {
            for (const suf of this.suffixes) {
                if (stem.endsWith(suf) && stem.length > suf.length + 2) {
                    stems.add(stem.slice(0, -suf.length));
                }
            }
        }
        return Array.from(stems);
    }
    
    /**
     * @typedef {Object} AnalyzedToken
     * @property {string} original
     * @property {string} normalized
     * @property {string} stem
     * @property {{concept: string, weight: number}[]} concepts
     */

    /**
     * @typedef {Object} ConceptInsight
     * @property {number} frequency
     * @property {number} totalWeight
     * @property {string[]} sourceTokens
     */

    /**
     * @typedef {Object} SemanticMap
     * @property {string} rawText
     * @property {AnalyzedToken[]} tokens
     * @property {Object.<string, ConceptInsight>} conceptInsights
     * @property {string[]} allConcepts
     * @property {{tokenCount: number, conceptCount: number}} stats
     */

    /**
     * The main analysis function. Transforms raw text into a rich SemanticMap.
     * @param {string} text - The raw user input.
     * @returns {SemanticMap} The comprehensive SemanticMap object.
     */
    analyze(text) {
        const rawText = String(text || '');
        // Use the advanced tokenizer from utils, passing the loaded stop words
        const initialTokens = tokenize(rawText, this.stopWords);

        const analyzedTokens = [];
        const conceptInsights = new Map();
        const usedIndices = new Set();

        // --- Pass 1: Multi-word concepts (trigrams, then bigrams) ---
        const ngrams = [...generateNgrams(initialTokens, 3), ...generateNgrams(initialTokens, 2)];
        
        for (const ngram of ngrams) {
            const mappings = this.conceptMap[ngram];
            if (mappings) {
                const ngramTokens = ngram.split(' ');
                // Find the first occurrence of this ngram that hasn't been used yet
                const startIndex = initialTokens.findIndex((t, i) => 
                    !usedIndices.has(i) && initialTokens.slice(i, i + ngramTokens.length).join(' ') === ngram
                );
                
                if (startIndex !== -1) {
                    // Mark indices as used
                    for (let i = 0; i < ngramTokens.length; i++) {
                        usedIndices.add(startIndex + i);
                    }
                    // Update insights with the found concepts
                    mappings.forEach(mapping => this._updateConceptInsights(conceptInsights, mapping, ngram));
                }
            }
        }

        // --- Pass 2: Process single words with DEEP analysis ---
        for (let i = 0; i < initialTokens.length; i++) {
            if (usedIndices.has(i)) continue;

            const original = initialTokens[i];
            const normalized = normalizeArabic(original);
            
            // Generate all possible stems for the token
            const possibleStems = this._deepStem(normalized);
            const searchTerms = [...new Set([original, normalized, ...possibleStems])];
            
            let mappings = [];
            let foundDirectly = false;

            // 1. Attempt direct mapping from the concept map
            for (const term of searchTerms) {
                if (this.conceptMap[term]) {
                    mappings.push(...this.conceptMap[term]);
                    foundDirectly = true;
                }
            }
            mappings = [...new Set(mappings.map(m => JSON.stringify(m)))].map(s => JSON.parse(s));

            // 2. If no direct match, attempt semantic inference via roots
            if (!foundDirectly) {
                for (const stem of possibleStems) {
                    if (this.rootToAnchorMap.has(stem)) {
                        const anchor = this.rootToAnchorMap.get(stem)[0]; // Take the primary anchor
                        const topEmotion = Object.keys(anchor.mood_scores || {})
                            .sort((a, b) => anchor.mood_scores[b] - anchor.mood_scores[a])[0];
                        
                        if (topEmotion) {
                            // Infer the concept from the anchor's primary emotion
                            mappings.push({ concept: topEmotion, weight: 0.6, inferred: true }); // Lower weight for inferred concepts
                            break; // Stop after the first successful inference
                        }
                    }
                }
            }
            
            analyzedTokens.push({
                original,
                normalized,
                stem: possibleStems[possibleStems.length - 1], // Use the shortest stem as the primary one
                concepts: mappings
            });

            mappings.forEach(mapping => this._updateConceptInsights(conceptInsights, mapping, original));
        }

        const allUniqueConcepts = Array.from(conceptInsights.keys());

        return {
            rawText,
            tokens: analyzedTokens,
            conceptInsights: Object.fromEntries(conceptInsights),
            allConcepts: allUniqueConcepts,
            stats: {
                tokenCount: analyzedTokens.length,
                conceptCount: allUniqueConcepts.length,
            }
        };
    }
    
    /**
     * Helper to update the main concept insights map.
     * @private
     */
    _updateConceptInsights(insightsMap, mapping, sourceToken) {
        const { concept, weight } = mapping;
        if (!insightsMap.has(concept)) {
            insightsMap.set(concept, {
                frequency: 0,
                totalWeight: 0,
                sourceTokens: []
            });
        }
        const insight = insightsMap.get(concept);
        insight.frequency += 1;
        insight.totalWeight += weight;
        if (!insight.sourceTokens.includes(sourceToken)) {
            insight.sourceTokens.push(sourceToken);
        }
    }
}
