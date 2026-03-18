// /analysis_engines/synthesis_engine.js
// SynthesisEngine v2.0 - High Intelligence Layer (Upgraded)

import { getTopN } from '../core/utils.js';

export class SynthesisEngine {
    constructor(dictionaries) {
        if (!dictionaries || !dictionaries.PATTERNS || !dictionaries.BEHAVIOR_VALUES) {
            console.error("❌ SynthesisEngine: Missing required dictionaries.");
            this.patternsDict = { findPatternsByConcepts: () => [], NARRATIVE_TENSIONS_V6: [] };
            this.behaviorValuesDict = { analyzeUserProfile: () => ({ topValues: [] }), VALUE_SYSTEMS: {} };
        } else {
            this.patternsDict = dictionaries.PATTERNS;
            this.behaviorValuesDict = dictionaries.BEHAVIOR_VALUES;
        }
    }

    // =============================================================================
    // 🧠 NEW: Enrich Concepts from SemanticEngine
    // =============================================================================
    _enrichConcepts(semanticMap) {
        const enriched = {};

        if (semanticMap.concepts) {
            for (const [key, val] of Object.entries(semanticMap.concepts)) {
                enriched[key] = val.importance || 0.5;
            }
        }

        if (semanticMap.psychologicalPatterns) {
            const p = semanticMap.psychologicalPatterns;

            p.distortions?.forEach(d => {
                enriched[`distortion:${d.type}`] = 0.9;
            });

            p.defenses?.forEach(d => {
                enriched[`defense:${d.type}`] = 0.8;
            });
        }

        return enriched;
    }

    // =============================================================================
    // 🧠 NEW: Meta Meaning Detection (HIGH INTELLIGENCE)
    // =============================================================================
    _detectMetaMeaning(concepts) {
        const insights = [];

        const keys = Object.keys(concepts);

        const hasDoubt = keys.some(c => c.includes('شك'));
        const hasGeneralization = keys.some(c => c.includes('all_or_nothing'));

        if (hasDoubt && hasGeneralization) {
            insights.push({
                type: 'paranoia_signal',
                description: 'فقدان ثقة عام في الآخرين',
                confidence: 0.9
            });
        }

        const hasFear = keys.some(c => c.includes('fear'));
        if (hasFear && hasDoubt) {
            insights.push({
                type: 'insecurity_pattern',
                description: 'الشعور بعدم الأمان يؤدي إلى الشك',
                confidence: 0.8
            });
        }

        return insights;
    }

    // =============================================================================
    // 🧠 NEW: Emotion Bias Injection
    // =============================================================================
    _injectEmotionBias(concepts, emotionProfile) {
        if (!emotionProfile) return concepts;

        const boosted = { ...concepts };

        if (emotionProfile.primary === 'fear') {
            Object.keys(boosted).forEach(k => boosted[k] *= 1.2);
        }

        if (emotionProfile.primary === 'anger') {
            Object.keys(boosted).forEach(k => boosted[k] *= 1.1);
        }

        return boosted;
    }

    // =============================================================================
    // 🔍 EXISTING: Pattern Detection (unchanged)
    // =============================================================================
    _findPatternsAndTensions(conceptProfile = {}) {
        const presentConcepts = Object.keys(conceptProfile);

        const detectedPatterns = this.patternsDict.findPatternsByConcepts ?
            this.patternsDict.findPatternsByConcepts(presentConcepts, this.patternsDict.CAUSAL_PATTERNS_V6) : [];

        const detectedTensions = [];
        const tensionsList = this.patternsDict.NARRATIVE_TENSIONS_V6 || [];

        for (const tension of tensionsList) {
            const poleA_present = tension.pole_a.concepts.some(c => presentConcepts.includes(c));
            const poleB_present = tension.pole_b.concepts.some(c => presentConcepts.includes(c));

            if (poleA_present && poleB_present) {
                const poleA_strength = tension.pole_a.concepts.reduce((sum, c) => sum + (conceptProfile[c] || 0), 0);
                const poleB_strength = tension.pole_b.concepts.reduce((sum, c) => sum + (conceptProfile[c] || 0), 0);
                detectedTensions.push({ ...tension, strength: poleA_strength + poleB_strength });
            }
        }

        detectedTensions.sort((a, b) => b.strength - a.strength);

        return {
            topPattern: detectedPatterns[0] || null,
            topTension: detectedTensions[0] || null,
            allPatterns: detectedPatterns,
            allTensions: detectedTensions
        };
    }

    // =============================================================================
    // 🧠 EXISTING: Hypotheses (Enhanced)
    // =============================================================================
    _generateCoreHypotheses(topPattern, topTension, conceptProfile, metaInsights) {
        const hypotheses = [];

        if (topPattern) {
            const analysis = this.behaviorValuesDict.analyzeUserProfile(
                topPattern.trigger_concepts.concat(topPattern.resulting_concepts)
            );

            const topValue = analysis.topValues?.[0];

            if (topValue) {
                const valueData = this.behaviorValuesDict.VALUE_SYSTEMS[topValue.key];

                hypotheses.push({
                    id: 'pattern_driven_by_value',
                    type: 'causal_hypothesis',
                    statement: `النمط '${topPattern.description}' قد يكون مرتبط بقيمة '${valueData?.value || topValue.key}'.`,
                    confidence: 0.75
                });
            }
        }

        if (topTension) {
            hypotheses.push({
                id: 'tension_as_choice',
                type: 'framing_hypothesis',
                statement: `يبدو أنك بين '${topTension.pole_a.name}' و '${topTension.pole_b.name}'.`,
                confidence: 0.85
            });
        }

        // 🔥 NEW: Meta Insights → Hypotheses
        metaInsights.forEach(insight => {
            hypotheses.push({
                id: insight.type,
                type: 'meta_insight',
                statement: insight.description,
                confidence: insight.confidence
            });
        });

        return hypotheses;
    }

    // =============================================================================
    // 🚀 MAIN ANALYSIS (UPGRADED)
    // =============================================================================
    analyze({ semanticMap, emotionProfile }) {

        if (!semanticMap) {
            return { error: "Invalid input: SemanticMap is required." };
        }

        // 🧠 Step 1: Enrich Concepts
        const enrichedConcepts = this._enrichConcepts(semanticMap);

        // 🧠 Step 2: Inject Emotion
        const conceptProfile = this._injectEmotionBias(enrichedConcepts, emotionProfile);

        // 🧠 Step 3: Meta Understanding
        const metaInsights = this._detectMetaMeaning(conceptProfile);

        // 🔍 Step 4: Patterns
        const { topPattern, topTension, allPatterns, allTensions } =
            this._findPatternsAndTensions(conceptProfile);

        // 🧠 Step 5: Hypotheses
        const hypotheses = this._generateCoreHypotheses(
            topPattern,
            topTension,
            conceptProfile,
            metaInsights
        );

        return {
            dominantPattern: topPattern,
            coreConflict: topTension,
            cognitiveHypotheses: hypotheses,
            metaInsights, // 🔥 NEW

            narrative: {
                shadow: topPattern?.description || null,
                light: topTension?.description || null
            },

            intelligence: {
                depthLevel: 'HIGH',
                detectedSignals: metaInsights.length,
                emotionalBias: emotionProfile?.primary || 'neutral'
            },

            _meta: {
                allDetectedPatterns: allPatterns,
                allDetectedTensions: allTensions,
                engineVersion: "2.0-High-Intelligence"
            }
        };
    }
}

export default SynthesisEngine;
