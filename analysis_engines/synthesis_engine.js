
// /analysis_engines/synthesis_engine.js
// SynthesisEngine v3.0 - Unified Workspace & Cognitive Field Integration
// وظيفته: ربط الخيوط الدلالية والعاطفية داخل الـ Workspace لإنتاج "البصيرة الكلية"

import { getTopN } from '../core/utils.js';

export class SynthesisEngine {
    constructor(dictionaries) {
        console.log("%c🧬 [SynthesisEngine v3.0] تهيئة محرك النسيج المعرفي الموحد...", "color: #4CAF50; font-weight: bold;");
        
        if (!dictionaries || !dictionaries.PATTERNS || !dictionaries.BEHAVIOR_VALUES) {
            console.error("❌ [SynthesisEngine]: القواميس المطلوبة مفقودة!");
            this.patternsDict = { findPatternsByConcepts: () => [], NARRATIVE_TENSIONS_V6: [] };
            this.behaviorValuesDict = { analyzeUserProfile: () => ({ topValues: [] }), VALUE_SYSTEMS: {} };
        } else {
            this.patternsDict = dictionaries.PATTERNS;
            this.behaviorValuesDict = dictionaries.BEHAVIOR_VALUES;
            console.log("✅ [SynthesisEngine] تم ربط المحرك بقواميس الأنماط والقيم السلوكية.");
        }
    }

    /**
     * العملية الرئيسية: إثراء الـ Workspace بالتركيب النفسي (Synthesis)
     */
    async analyze(workspace, context = {}) {
        console.log("\n" + "%c[Cognitive Synthesis] STARTING ENRICHMENT...".repeat(1), "background: #4CAF50; color: #fff; padding: 2px 5px;");

        if (!workspace || !workspace.semantic || !workspace.emotion) {
            console.error("❌ [SynthesisEngine]: بيانات السيمانتيك أو العواطف مفقودة في الـ Workspace.");
            return;
        }

        try {
            const semanticMap = workspace.semantic;
            const emotionProfile = workspace.emotion;

            // 1. إثراء المفاهيم (Enriching)
            const enrichedConcepts = this._enrichConcepts(semanticMap);

            // 2. حقن التحيز العاطفي (Emotion Bias Injection)
            // المحرك هنا "يستشعر" حالة القلب (Emotion) ويعدل أوزان العقل (Concepts)
            const conceptProfile = this._injectEmotionBias(enrichedConcepts, emotionProfile);

            // 3. كشف المعاني العميقة (Meta Meaning Detection)
            const metaInsights = this._detectMetaMeaning(conceptProfile);

            // 4. البحث عن الأنماط والتوترات (Patterns & Tensions)
            const { topPattern, topTension, allPatterns, allTensions } =
                this._findPatternsAndTensions(conceptProfile);

            // 5. توليد الفرضيات النفسية (Core Hypotheses)
            const hypotheses = this._generateCoreHypotheses(
                topPattern,
                topTension,
                conceptProfile,
                metaInsights
            );

            // =========================================================
            // 🚀 حقن النتائج في الـ Workspace (إكمال الصورة الكبيرة)
            // =========================================================
            workspace.synthesis = {
                dominantPattern: topPattern,
                coreConflict: topTension,
                cognitiveHypotheses: hypotheses,
                metaInsights,
                narrative: {
                    shadow: topPattern?.description || "لم يتم رصد نمط سلبي واضح.",
                    light: topTension?.description || "لم يتم رصد صراع قيمي واضح."
                },
                _meta: {
                    allDetectedPatterns: allPatterns,
                    allDetectedTensions: allTensions,
                    engineVersion: "3.0-Workspace-Ready"
                }
            };

            // تحديث حالة الـ Workspace الكلية لاتخاذ القرار النهائي
            workspace.state.dominantPattern = topPattern?.pattern_id || "general_case";
            workspace.state.conflictDetected = !!topTension;
            workspace.state.intelligenceDepth = 'HIGH';

            console.log(`   ✅ [Synthesis Complete]: تم رصد نمط [${workspace.state.dominantPattern}] مع ${metaInsights.length} رؤى عميقة.`);

        } catch (err) {
            console.error("❌ [SynthesisEngine Error]:", err);
        }
    }

    // =============================================================================
    // 🧠 1. إثراء المفاهيم (Enriching) - نفس منطقك الأصلي
    // =============================================================================
    _enrichConcepts(semanticMap) {
        console.log("   🔍 [Step 1: Enrich] دمج المفاهيم والأنماط من الفضاء الدلالي...");
        const enriched = {};

        if (semanticMap.concepts) {
            for (const [key, val] of Object.entries(semanticMap.concepts)) {
                enriched[key] = val.impact || val.importance || 0.5;
            }
        }

        if (semanticMap.psychologicalPatterns) {
            const p = semanticMap.psychologicalPatterns;
            p.distortions?.forEach(d => { enriched[`distortion:${d.type}`] = 0.9; });
            p.defenses?.forEach(d => { enriched[`defense:${d.type}`] = 0.8; });
        }

        return enriched;
    }

    // =============================================================================
    // 🧠 2. كشف المعاني العميقة (Meta Meaning Detection) - نفس منطقك الأصلي
    // =============================================================================
    _detectMetaMeaning(concepts) {
        console.log("   🔍 [Step 2: Meta-Awareness] فحص التفاعلات بين المفاهيم المكتشفة...");
        const insights = [];
        const keys = Object.keys(concepts);

        const hasDoubt = keys.some(c => c.includes('شك') || c.includes('uncertainty'));
        const hasGeneralization = keys.some(c => c.includes('all_or_nothing'));

        if (hasDoubt && hasGeneralization) {
            console.log("      ⚠️ [Insight]: تم رصد إشارة فقدان ثقة عام.");
            insights.push({ type: 'paranoia_signal', description: 'فقدان ثقة عام في الآخرين', confidence: 0.9 });
        }

        const hasFear = keys.some(c => c.includes('fear'));
        if (hasFear && hasDoubt) {
            console.log("      ⚠️ [Insight]: تم رصد نمط عدم أمان يؤدي للشك.");
            insights.push({ type: 'insecurity_pattern', description: 'الشعور بعدم الأمان يؤدي إلى الشك', confidence: 0.8 });
        }

        return insights;
    }

    // =============================================================================
    // 🧠 3. حقن التحيز العاطفي (Emotion Bias Injection) - نفس منطقك الأصلي
    // =============================================================================
    _injectEmotionBias(concepts, emotionProfile) {
        if (!emotionProfile) return concepts;
        console.log(`   🔍 [Step 3: Bias] تعديل أوزان العقل بناءً على نبض القلب [${emotionProfile.primaryEmotion?.name}]...`);

        const boosted = { ...concepts };
        const primary = emotionProfile.primaryEmotion?.name;

        if (primary === 'fear' || primary === 'anxiety') {
            Object.keys(boosted).forEach(k => boosted[k] *= 1.2);
        }

        if (primary === 'anger') {
            Object.keys(boosted).forEach(k => boosted[k] *= 1.1);
        }

        return boosted;
    }

    // =============================================================================
    // 🔍 4. البحث عن الأنماط والتوترات (Patterns & Tensions) - نفس منطقك الأصلي
    // =============================================================================
    _findPatternsAndTensions(conceptProfile = {}) {
        console.log("   🔍 [Step 4: Matching] مطابقة مخرجات الفضاء مع الأنماط السريرية...");
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
                console.log(`      ⚖️ [Tension]: رصد صراع بين [${tension.pole_a.name}] و [${tension.pole_b.name}]`);
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
    // 🧠 5. توليد الفرضيات النفسية (Core Hypotheses) - نفس منطقك الأصلي
    // =============================================================================
    _generateCoreHypotheses(topPattern, topTension, conceptProfile, metaInsights) {
        console.log("   🔍 [Step 5: Logic] بناء الفرضيات الاستنتاجية للحالة...");
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
}

export default SynthesisEngine;
