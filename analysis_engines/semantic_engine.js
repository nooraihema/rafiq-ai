// /analysis_engines/semantic_engine.js
// Semantic Engine v4.0 - The Conceptual Advisor
// This hyper-aware version performs multi-layered searches and semantic inference,
// and crucially, it enriches the output with the full knowledge profile from
// CONCEPT_DEFINITIONS, turning raw concepts into actionable insights.

import { normalizeArabic, tokenize, generateNgrams } from '../core/utils.js';

export class SemanticEngine {
    constructor(dictionaries) {
        if (!dictionaries || !dictionaries.CONCEPT_MAP || !dictionaries.AFFIX_DICTIONARY || !dictionaries.STOP_WORDS_SET || !dictionaries.EMOTIONAL_ANCHORS_DICTIONARY || !dictionaries.CONCEPT_DEFINITIONS) {
            throw new Error("SemanticEngine v4.0 requires comprehensive dictionaries, including CONCEPT_DEFINITIONS.");
        }
        this.conceptMap = dictionaries.CONCEPT_MAP;
        this.conceptDefs = dictionaries.CONCEPT_DEFINITIONS; // --- [إضافة جديدة] ---
        this.affixes = dictionaries.AFFIX_DICTIONARY;
        this.stopWords = dictionaries.STOP_WORDS_SET;
        this.emotionalAnchors = dictionaries.EMOTIONAL_ANCHORS_DICTIONARY;
        this.debug = true;

        this.rootToAnchorMap = this._buildRootToAnchorMap();
        this.prefixes = (this.affixes.prefixes || []).map(p => p.value).sort((a, b) => b.length - a.length);
        this.suffixes = (this.affixes.suffixes || []).map(s => s.value).sort((a, b) => b.length - a.length);
    }

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

    _deepStem(token) {
        let stems = new Set([token]);
        let currentToken = token;
        for (const pre of this.prefixes) {
            if (currentToken.startsWith(pre) && currentToken.length > pre.length + 2) {
                stems.add(currentToken.slice(pre.length));
            }
        }
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
    
    // ... (typedefs can be updated to reflect the richer ConceptInsight)

    analyze(text) {
        const rawText = String(text || '');
        if (this.debug) console.log(`\n--- [SemanticEngine v4.0] Analyzing text: "${rawText}" ---`);
        
        const initialTokens = tokenize(rawText, this.stopWords);
        if (this.debug) console.log(`[Semantic] 1. Tokens after stopword removal:`, initialTokens);

        const conceptInsights = new Map();
        const usedIndices = new Set();
        const analyzedTokens = [];

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
                    for (let i = 0; i < ngramTokens.length; i++) usedIndices.add(startIndex + i);
                    mappings.forEach(mapping => this._updateConceptInsights(conceptInsights, mapping, ngram, 'direct_ngram_match'));
                }
            }
        }

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
            
            for (const term of searchTerms) {
                if (this.conceptMap[term]) {
                    const mappings = this.conceptMap[term];
                    if (this.debug) console.log(`    ✅ [Direct Match] Found on term "${term}" ->`, mappings.map(m => m.concept));
                    mappings.forEach(m => allFoundMappings.push({ ...m, provenance: 'direct_match', matchedTerm: term }));
                }
            }

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
            
            const uniqueMappings = [...new Map(allFoundMappings.map(m => [m.concept, m])).values()];

            analyzedTokens.push({
                original,
                normalized,
                stem: possibleStems[possibleStems.length - 1],
                concepts: uniqueMappings
            });

            uniqueMappings.forEach(mapping => this._updateConceptInsights(conceptInsights, mapping, original, mapping.provenance));
        }

        // --- [تطوير جديد] Step 4: Inference via Links ---
        if (this.debug) console.log(`\n[Semantic] 4. Running inference via concept links...`);
        const inferredConcepts = new Map();
        for (const [concept, insight] of conceptInsights.entries()) {
            for (const link of (insight.links || [])) {
                if (link.type === 'often_co_occurs_with' || link.type === 'can_lead_to') {
                    if (!conceptInsights.has(link.concept) && !inferredConcepts.has(link.concept)) {
                         if (this.debug) console.log(`    🔗 [Link Inference] Concept '${concept}' suggests adding '${link.concept}'.`);
                         const definition = this.conceptDefs[link.concept] || {};
                         inferredConcepts.set(link.concept, {
                            frequency: 0,
                            totalWeight: 0.3,
                            sourceTokens: [`inferred_from_${concept}`],
                            provenance: new Set(['link_inference']),
                            description: definition.description,
                            tags: definition.tags || [],
                            interventions: definition.interventions || [],
                            probing_questions: definition.probing_questions || [],
                            links: definition.links || [],
                            risk_level: definition.risk_level || 0
                         });
                    }
                }
            }
        }
        
        inferredConcepts.forEach((value, key) => {
            if (!conceptInsights.has(key)) {
                conceptInsights.set(key, value);
            }
        });


        const allUniqueConcepts = Array.from(conceptInsights.keys());
        if (this.debug) {
             console.log(`\n[Semantic] 5. Analysis Complete. Final Insights (including inferred):`);
             const loggableInsights = Object.fromEntries(
                Array.from(conceptInsights.entries()).map(([key, value]) => [key, { ...value, provenance: Array.from(value.provenance) }])
             );
             console.log(JSON.stringify(loggableInsights, null, 2));
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

        if (this.debug) console.log(`--- [SemanticEngine v4.0] Finished. Pivotal concept: "${finalMap.pivotalConcept}" ---`);
        return finalMap;
    }
    
    _updateConceptInsights(insightsMap, mapping, sourceToken, provenance) {
        const { concept, weight } = mapping;
        if (!insightsMap.has(concept)) {
            const definition = this.conceptDefs[concept] || {};
            insightsMap.set(concept, {
                frequency: 0,
                totalWeight: 0,
                sourceTokens: [],
                provenance: new Set(),
                description: definition.description,
                tags: definition.tags || [],
                interventions: definition.interventions || [],
                probing_questions: definition.probing_questions || [],
                links: definition.links || [],
                risk_level: definition.risk_level || 0
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
