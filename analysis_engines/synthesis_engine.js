// /analysis_engines/synthesis_engine.js - The Weaver of Meanings v1.1
// محرك التركيب الدلالي - تم تصحيح التصدير ليعمل في المتصفح بنسبة 100%

import { getTopN } from '../core/utils.js';

// أضفنا export هنا لتعريف الكلاس كجزء من نظام الـ Modules
export class SynthesisEngine {
    constructor(dictionaries) {
        // التأكد من تحميل القواميس الضرورية للعمل
        if (!dictionaries || !dictionaries.PATTERNS || !dictionaries.BEHAVIOR_VALUES) {
            console.error("❌ SynthesisEngine: Missing required dictionaries (PATTERNS or BEHAVIOR_VALUES).");
            this.patternsDict = { findPatternsByConcepts: () => [], NARRATIVE_TENSIONS_V6: [] };
            this.behaviorValuesDict = { analyzeUserProfile: () => ({ topValues: [] }), VALUE_SYSTEMS: {} };
        } else {
            this.patternsDict = dictionaries.PATTERNS;
            this.behaviorValuesDict = dictionaries.BEHAVIOR_VALUES;
        }
    }

    /**
     * البحث عن الأنماط والتوترات النفسية بناءً على المفاهيم المكتشفة
     * @private
     */
    _findPatternsAndTensions(conceptProfile = {}) {
        const presentConcepts = Object.keys(conceptProfile);
        
        // البحث عن الأنماط السببية
        const detectedPatterns = this.patternsDict.findPatternsByConcepts ? 
                                 this.patternsDict.findPatternsByConcepts(presentConcepts, this.patternsDict.CAUSAL_PATTERNS_V6) : [];
        
        const detectedTensions = [];
        const tensionsList = this.patternsDict.NARRATIVE_TENSIONS_V6 || [];

        for (const tension of tensionsList) {
            const poleA_present = tension.pole_a.concepts.some(c => presentConcepts.includes(c));
            const poleB_present = tension.pole_b.concepts.some(c => presentConcepts.includes(c));
            
            if (poleA_present && poleB_present) {
                // حساب قوة الصراع بناءً على أوزان المفاهيم
                const poleA_strength = tension.pole_a.concepts.reduce((sum, c) => sum + (conceptProfile[c] || 0), 0);
                const poleB_strength = tension.pole_b.concepts.reduce((sum, c) => sum + (conceptProfile[c] || 0), 0);
                detectedTensions.push({ ...tension, strength: poleA_strength + poleB_strength });
            }
        }
        
        // ترتيب التوترات حسب القوة
        detectedTensions.sort((a, b) => b.strength - a.strength);

        return {
            topPattern: detectedPatterns[0] || null,
            topTension: detectedTensions[0] || null,
            allPatterns: detectedPatterns,
            allTensions: detectedTensions
        };
    }

    /**
     * توليد فرضيات نفسية عميقة تربط الأنماط بالقيم الدفاعية
     * @private
     */
    _generateCoreHypotheses(topPattern, topTension, conceptProfile) {
        const hypotheses = [];

        // فرضية 1: ربط النمط بالقيم الأساسية
        if (topPattern) {
            const analysis = this.behaviorValuesDict.analyzeUserProfile(
                topPattern.trigger_concepts.concat(topPattern.resulting_concepts)
            );
            const topValue = analysis.topValues && analysis.topValues.length > 0 ? analysis.topValues[0] : null;
            
            if (topValue) {
                const valueData = this.behaviorValuesDict.VALUE_SYSTEMS[topValue.key];
                hypotheses.push({
                    id: 'pattern_driven_by_value',
                    type: 'causal_hypothesis',
                    statement: `النمط السائد لـ '${topPattern.description.split(':')[0]}' قد يكون مدفوعاً بقيمة أساسية لديك وهي '${valueData ? valueData.value : topValue.key}'.`,
                    confidence: 0.7
                });
            }
        }
        
        // فرضية 2: تأطير الصراع كاختيار بين حاجتين
        if (topTension) {
            hypotheses.push({
                id: 'tension_as_choice',
                type: 'framing_hypothesis',
                statement: `الصراع الذي تشعر به يبدو وكأنه اختيار صعب بين '${topTension.pole_a.name}' و '${topTension.pole_b.name}'.`,
                confidence: 0.8
            });
        }
        
        return hypotheses;
    }

    /**
     * الوظيفة الأساسية للتحليل والتركيب
     */
    analyze({ semanticMap, emotionProfile }) {
        if (!semanticMap || !semanticMap.conceptInsights) {
            return { error: "Invalid input: SemanticMap is required." };
        }

        // استخراج أوزان المفاهيم
        const conceptProfile = {};
        for (const [concept, insight] of Object.entries(semanticMap.conceptInsights)) {
            conceptProfile[concept] = insight.totalWeight;
        }

        // الطبقة 1: إيجاد الأنماط والتوترات
        const { topPattern, topTension, allPatterns, allTensions } = this._findPatternsAndTensions(conceptProfile);

        // الطبقة 2: توليد الفرضيات النفسية
        const hypotheses = this._generateCoreHypotheses(topPattern, topTension, conceptProfile);
        
        return {
            dominantPattern: topPattern,
            coreConflict: topTension,
            cognitiveHypotheses: hypotheses,
            narrative: {
                shadow: topPattern ? topPattern.description : null,
                light: topTension ? topTension.description : null
            },
            _meta: {
                allDetectedPatterns: allPatterns,
                allDetectedTensions: allTensions,
                engineVersion: "1.1-Browser-Optimized"
            }
        };
    }
}

// السطر الذهبي: التصدير الافتراضي الذي يحل مشكلة الـ SyntaxError في المتصفح
export default SynthesisEngine;
