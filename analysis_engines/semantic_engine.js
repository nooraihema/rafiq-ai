// /analysis_engines/semantic_engine.js
// Semantic Engine v3.0 - The Insight Extractor
// This hyper-aware version performs multi-layered, exhaustive searches and
// semantic inference to extract concepts with full transparency and provenance.

import { normalizeArabic, tokenize, generateNgrams } from '../core/utils.js';

export class SemanticEngine {
    constructor(dictionaries) {
        if (!dictionaries || !dictionaries.CONCEPT_MAP || !dictionaries.AFFIX_DICTIONARY || !dictionaries.STOP_WORDS_SET || !dictionaries.EMOTIONAL_ANCHORS_DICTIONARY) {
            throw new Error("SemanticEngine v3.0 requires comprehensive dictionaries: CONCEPT_MAP, AFFIX_DICTIONARY, STOP_WORDS_SET, EMOTIONAL_ANCHORS_DICTIONARY.");
        }
        this.conceptMap = dictionaries.CONCEPT_MAP;
        this.affixes = dictionaries.AFFIX_DICTIONARY;
        this.stopWords = dictionaries.STOP_WORDS_SET;
        this.emotionalAnchors = dictionaries.EMOTIONAL_ANCHORS_DICTIONARY;
        this.debug = true; // --- تفعيل وضع التصحيح ---

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
                    stems.add(stem.slice(0, -stem.length));
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
     * @property {{concept: string, weight: number, provenance: string}[]} concepts
     */

    /**
     * @typedef {Object} ConceptInsight
     * @property {number} frequency
     * @property {number} totalWeight
     * @property {string[]} sourceTokens
     * @property {Set<string>} provenance
     */

    /**
     * @typedef {Object} SemanticMap
     * @property {string} rawText
     * @property {AnalyzedToken[]} tokens
     * @property {Object.<string, ConceptInsight>} conceptInsights
     * @property {string[]} allConcepts
     * @property {string|null} pivotalConcept
     * @property {{tokenCount: number, conceptCount: number}} stats
     */

    /**
     * The main analysis function. Transforms raw text into a rich SemanticMap.
     * @param {string} text - The raw user input.
     * @returns {SemanticMap} The comprehensive SemanticMap object.
     */
    analyze(text) {
        const rawText = String(text || '');
        if (this.debug) console.log(`\n--- [SemanticEngine v3.0] Analyzing text: "${rawText}" ---`);
        
        const initialTokens = tokenize(rawText, this.stopWords);
        if (this.debug) console.log(`[Semantic] 1. Tokens after stopword removal:`, initialTokens);

        const analyzedTokens = [];
        const conceptInsights = new Map();
        const usedIndices = new Set();

        // --- Pass 1: Multi-word concepts (trigrams, then bigrams) ---
        const ngrams = [...generateNgrams(initialTokens, 3), ...generateNgrams(initialTokens, 2)];
        if (this.debug) console.log(`[Semantic] 2. Generated n-grams for phrase matching:`, ngrams);
        
        for (const ngram of ngrams) {
            const normalizedNgram = normalizeArabic(ngram);
            const mappings = this.conceptMap[normalizedNgram];
            if (mappings) {
                if (this.debug) console.log(`  > Direct N-gram Match Found: "${ngram}" ->`, mappings.map(m=>m.concept));
                const ngramTokens = ngram.split(' ');
                const startIndex = initialTokens.findIndex((t, i) => 
                    !usedIndices.has(i) && initialTokens.slice(i, i + ngramTokens.length).join(' ') === ngram
                );
                if (startIndex !== -1) {
                    for (let i = 0; i < ngramTokens.length; i++) {
                        usedIndices.add(startIndex + i);
                    }
                    mappings.forEach(mapping => this._updateConceptInsights(conceptInsights, mapping, ngram, 'direct_ngram_match'));
                }
            }
        }

        // --- Pass 2: Process single words with HYPER-AWARE analysis ---
        if (this.debug) console.log(`[Semantic] 3. Starting single-word deep analysis...`);
        for (let i = 0; i < initialTokens.length; i++) {
            if (usedIndices.has(i)) continue;

            const original = initialTokens[i];
            const normalized = normalizeArabic(original);
            if (this.debug) console.log(`\n  --- Analyzing token: "${original}" ---`);
            
            const possibleStems = this._deepStem(normalized);
            const searchTerms = [...new Set([original, normalized, ...possibleStems])];
            if (this.debug) console.log(`    - Generated search terms:`, searchTerms);
            
            let allFoundMappings = [];
            
            // Strategy 1: Exhaustive Direct Search
            for (const term of searchTerms) {
                if (this.conceptMap[term]) {
                    const mappings = this.conceptMap[term];
                    if (this.debug) console.log(`    ✅ [Direct Match] Found on term "${term}" ->`, mappings.map(m => m.concept));
                    mappings.forEach(m => allFoundMappings.push({ ...m, provenance: 'direct_match', matchedTerm: term }));
                }
            }

            // Strategy 2: Semantic Inference via Roots (if no direct match)
            if (allFoundMappings.length === 0) {
                if (this.debug) console.log(`    - No direct match. Attempting semantic inference via roots...`);
                for (const stem of possibleStems) {
                    if (this.rootToAnchorMap.has(stem)) {
                        const anchor = this.rootToAnchorMap.get(stem)[0];
                        const topEmotion = Object.keys(anchor.mood_scores || {})
                            .sort((a, b) => (anchor.mood_scores[b] || 0) - (anchor.mood_scores[a] || 0))[0];
                        
                        if (topEmotion) {
                            if (this.debug) console.log(`    ✅ [Inference] Stem "${stem}" links to root "${anchor.root}", inferring concept -> "${topEmotion}"`);
                            allFoundMappings.push({ concept: topEmotion, weight: 0.65, provenance: 'root_inference', matchedTerm: stem });
                            break; 
                        }
                    }
                }
            }
            
            // Remove duplicate mappings before adding to token data
            const uniqueMappings = [...new Map(allFoundMappings.map(m => [m.concept, m])).values()];

            analyzedTokens.push({
                original,
                normalized,
                stem: possibleStems[possibleStems.length - 1],
                concepts: uniqueMappings
            });

            uniqueMappings.forEach(mapping => this._updateConceptInsights(conceptInsights, mapping, original, mapping.provenance));
        }

        const allUniqueConcepts = Array.from(conceptInsights.keys());
        if (this.debug) {
             console.log(`\n[Semantic] 4. Analysis Complete. Final Insights:`);
             // Convert Set to Array for better logging in Vercel
             const loggableInsights = Object.fromEntries(
                Array.from(conceptInsights.entries()).map(([key, value]) => [key, { ...value, provenance: Array.from(value.provenance) }])
             );
             console.log(loggableInsights);
        }

        const finalMap = {
            rawText,
            tokens: analyzedTokens,
            conceptInsights: Object.fromEntries(conceptInsights),
            allConcepts: allUniqueConcepts,
            pivotalConcept: this._findPivotalConcept(conceptInsights),
            stats: {
                tokenCount: initialTokens.length,
                conceptCount: allUniqueConcepts.length,
            }
        };

        if (this.debug) console.log(`--- [SemanticEngine v3.0] Finished. Pivotal concept: "${finalMap.pivotalConcept}" ---`);
        return finalMap;
    }
    
    /**
     * Helper to update the main concept insights map.
     * @private
     */
    _updateConceptInsights(insightsMap, mapping, sourceToken, provenance) {
        const { concept, weight } = mapping;
        if (!insightsMap.has(concept)) {
            insightsMap.set(concept, {
                frequency: 0,
                totalWeight: 0,
                sourceTokens: [],
                provenance: new Set()
            });
        }
        const insight = insightsMap.get(concept);
        insight.frequency += 1;
        insight.totalWeight += weight;
        if (!insight.sourceTokens.includes(sourceToken)) {
            insight.sourceTokens.push(sourceToken);
        }
        insight.provenance.add(provenance);
    }

    /**
     * Finds the most significant concept based on totalWeight.
     * @private
     */
    _findPivotalConcept(insightsMap) {
        if (!insightsMap || insightsMap.size === 0) return null;
        let pivotalConcept = null;
        let maxWeight = -1;
        for (const [concept, insight] of insightsMap.entries()) {
            if (insight.totalWeight > maxWeight) {
                maxWeight = insight.totalWeight;
                pivotalConcept = concept;
            }
        }
        return pivotalConcept;
    }
}
