// /analysis_engines/synthesis_engine.js
// SynthesisEngine v1.0 - The Weaver of Meanings
// This hyper-intelligent engine synthesizes insights from all lower-level analyses
// to construct a cohesive psychodynamic narrative, generate core hypotheses, and
// formulate an actionable therapeutic plan.

import { getTopN } from '../core/utils.js';

export class SynthesisEngine {
    constructor(dictionaries) {
        if (!dictionaries.PATTERNS || !dictionaries.BEHAVIOR_VALUES) {
            throw new Error("SynthesisEngine v1.0 requires PATTERNS and BEHAVIOR_VALUES dictionaries.");
        }
        this.patternsDict = dictionaries.PATTERNS;
        this.behaviorValuesDict = dictionaries.BEHAVIOR_VALUES;
    }

    /**
     * [CORE v1.0] Finds patterns and tensions based on a concept profile.
     * This is an enhanced version that prioritizes more impactful patterns.
     * @private
     */
    _findPatternsAndTensions(conceptProfile = {}) {
        const presentConcepts = Object.keys(conceptProfile);
        const detectedPatterns = this.patternsDict.findPatternsByConcepts(presentConcepts, this.patternsDict.CAUSAL_PATTERNS_V6);
        
        const detectedTensions = [];
        for (const tension of this.patternsDict.NARRATIVE_TENSIONS_V6) {
            const poleA_present = tension.pole_a.concepts.some(c => presentConcepts.includes(c));
            const poleB_present = tension.pole_b.concepts.some(c => presentConcepts.includes(c));
            if (poleA_present && poleB_present) {
                // Calculate the "strength" of the tension based on the concepts' weights
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

    /**
     * [CORE v1.0] Generates deep hypotheses connecting patterns to underlying values and defenses.
     * @private
     */
    _generateCoreHypotheses(topPattern, topTension, conceptProfile) {
        if (!topPattern && !topTension) return [];
        
        const hypotheses = [];

        // Hypothesis 1: Connect the primary pattern to a potential underlying value conflict.
        if (topPattern) {
            const analysis = this.behaviorValuesDict.analyzeUserProfile(topPattern.trigger_concepts.concat(topPattern.resulting_concepts));
            const topValue = analysis.topValues[0];
            if (topValue) {
                const valueData = this.behaviorValuesDict.VALUE_SYSTEMS[topValue.key];
                hypotheses.push({
                    id: 'pattern_driven_by_value',
                    type: 'causal_hypothesis',
                    statement: `النمط السائد لـ '${topPattern.description.split(':')[0]}' قد يكون مدفوعًا بقيمة أساسية لديك وهي '${valueData.value}'. هل تجد أن هذا صحيح؟`,
                    confidence: 0.7,
                    related: { pattern: topPattern.pattern_id, value: topValue.key }
                });
            }
        }
        
        // Hypothesis 2: Frame the core tension as a choice between two fundamental needs.
        if (topTension) {
            hypotheses.push({
                id: 'tension_as_choice',
                type: 'framing_hypothesis',
                statement: `الصراع الذي تشعر به يبدو وكأنه اختيار صعب بين '${topTension.pole_a.name}' و '${topTension.pole_b.name}'. فهم هذا الصراع هو الخطوة الأولى نحو إيجاد التوازن.`,
                confidence: 0.8,
                related: { tension: topTension.tension_id }
            });
        }
        
        // Hypothesis 3 (Meta-Hypothesis): Connect the pattern and tension if possible.
        if (topPattern && topTension) {
            const patternConcepts = new Set([...topPattern.trigger_concepts, ...topPattern.resulting_concepts]);
            const tensionConcepts = new Set([...topTension.pole_a.concepts, ...topTension.pole_b.concepts]);
            const intersection = [...patternConcepts].filter(c => tensionConcepts.has(c));

            if (intersection.length > 0) {
                hypotheses.push({
                    id: 'meta_synthesis',
                    type: 'synthesis_hypothesis',
                    statement: `يبدو أن الحلقة المفرغة لـ '${topPattern.description.split(':')[0]}' هي في الواقع تعبير عن الصراع الأعمق الذي تعيشه بين '${topTension.pole_a.name}' و '${topTension.pole_b.name}'.`,
                    confidence: 0.9,
                    related: { pattern: topPattern.pattern_id, tension: topTension.tension_id }
                });
            }
        }

        return hypotheses;
    }

    /**
     * The main supernatural analysis function.
     * @param {Object} semanticMap - The output from SemanticEngine.
     * @param {Object} emotionProfile - The output from EmotionEngine.
     * @returns {Object} A synthesized cognitive profile.
     */
    analyze({ semanticMap, emotionProfile }) {
        if (!semanticMap || !semanticMap.conceptInsights) {
            return { error: "Invalid input: SemanticMap is required." };
        }

        // Use the weighted concepts for more accurate pattern detection
        const conceptProfile = {};
        for (const [concept, insight] of Object.entries(semanticMap.conceptInsights)) {
            conceptProfile[concept] = insight.totalWeight;
        }

        // Layer 1: Find dominant patterns and tensions
        const { topPattern, topTension, allPatterns, allTensions } = this._findPatternsAndTensions(conceptProfile);

        // Layer 2: Generate core psychodynamic hypotheses
        const hypotheses = this._generateCoreHypotheses(topPattern, topTension, conceptProfile);
        
        // Layer 3: Formulate an actionable therapeutic plan
        let therapeuticPlan = null;
        if (topPattern) {
            therapeuticPlan = this.patternsDict.recommendAntidotesAndPlan([topPattern.pattern_id]);
        }
        
        // Layer 4: Identify the "Shadow" and the "Light"
        const shadow = topPattern ? {
            name: topPattern.description.split(':')[0],
            insight: topPattern.therapeutic_insight
        } : (topTension ? {
            name: `صراع بين ${topTension.pole_a.name} و ${topTension.pole_b.name}`,
            insight: topTension.therapeutic_insight
        } : null);

        const light = topPattern ? {
            name: `المهارات المضادة: ${topPattern.antidote_concepts.join(', ')}`,
            insight: `التركيز على هذه المهارات هو طريقك للخروج من هذه الحلقة.`
        } : (topTension ? {
            name: `إيجاد التوازن`,
            insight: `المفتاح ليس في انتصار طرف على آخر، بل في إيجاد منطقة وسطى ترضي الحاجتين.`
        } : null);
        
        return {
            dominantPattern: topPattern,
            coreConflict: topTension,
            cognitiveHypotheses: hypotheses,
            therapeuticPlan: therapeuticPlan,
            narrative: {
                shadow: shadow, // The core problem to be addressed
                light: light    // The path to growth and healing
            },
            _meta: {
                allDetectedPatterns: allPatterns,
                allDetectedTensions: allTensions
            }
        };
    }
}
