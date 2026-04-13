
// /analysis_engines/synthesis_engine.js
// SynthesisEngine v2.0 - High Intelligence Layer (Upgraded & Hyper-Logged)
// وظيفته: ربط المفاهيم، العواطف، الأنماط، والقيم للخروج بالخلاصة "الاستنتاجية"

import { getTopN } from '../core/utils.js';

export class SynthesisEngine {
    constructor(dictionaries) {
        console.log("🧬 [SynthesisEngine] جاري بدء تشغيل محرك التركيب والذكاء العالي...");
        
        if (!dictionaries || !dictionaries.PATTERNS || !dictionaries.BEHAVIOR_VALUES) {
            console.error("❌ [SynthesisEngine] فشل البدء: القواميس المطلوبة مفقودة!");
            this.patternsDict = { findPatternsByConcepts: () => [], NARRATIVE_TENSIONS_V6: [] };
            this.behaviorValuesDict = { analyzeUserProfile: () => ({ topValues: [] }), VALUE_SYSTEMS: {} };
        } else {
            this.patternsDict = dictionaries.PATTERNS;
            this.behaviorValuesDict = dictionaries.BEHAVIOR_VALUES;
            console.log("✅ [SynthesisEngine] تم تحميل قواميس الأنماط والقيم بنجاح.");
        }
    }

    // =============================================================================
    // 🧠 1. إثراء المفاهيم (Enriching)
    // =============================================================================
    _enrichConcepts(semanticMap) {
        console.log("   🔍 [Step 1: Enrich] جاري استخراج المفاهيم والأنماط النفسية من الخريطة الدلالية...");
        const enriched = {};

        if (semanticMap.concepts) {
            for (const [key, val] of Object.entries(semanticMap.concepts)) {
                enriched[key] = val.importance || 0.5;
            }
        }

        if (semanticMap.psychologicalPatterns) {
            const p = semanticMap.psychologicalPatterns;

            p.distortions?.forEach(d => {
                console.log(`      🧩 اكتشاف تشوه معرفي: [${d.type}] بوزن مرتفع 0.9`);
                enriched[`distortion:${d.type}`] = 0.9;
            });

            p.defenses?.forEach(d => {
                console.log(`      🛡️ اكتشاف آلية دفاعية: [${d.type}] بوزن 0.8`);
                enriched[`defense:${d.type}`] = 0.8;
            });
        }

        console.log(`   ✅ [Enrich] تم الانتهاء من إثراء ${Object.keys(enriched).length} مفهوم.`);
        return enriched;
    }

    // =============================================================================
    // 🧠 2. كشف المعاني العميقة (Meta Meaning Detection)
    // =============================================================================
    _detectMetaMeaning(concepts) {
        console.log("   🔍 [Step 2: Meta-Awareness] جاري البحث عن دلالات خفية وراء الكلمات...");
        const insights = [];
        const keys = Object.keys(concepts);

        // ذكاء اصطناعي استنتاجي: الربط بين الشك والتعميم
        const hasDoubt = keys.some(c => c.includes('شك') || c.includes('uncertainty'));
        const hasGeneralization = keys.some(c => c.includes('all_or_nothing') || c.includes('overgeneralization'));

        if (hasDoubt && hasGeneralization) {
            console.log("      ⚠️ تحليل ذكي: تم رصد إشارة (Paranoia) - فقدان ثقة ناتج عن تعميم سلبي.");
            insights.push({
                type: 'paranoia_signal',
                description: 'فقدان ثقة عام في الآخرين ناتج عن تعميم تجارب سابقة.',
                confidence: 0.9
            });
        }

        // الربط بين الخوف والشك
        const hasFear = keys.some(c => c.includes('fear') || c.includes('خوف'));
        if (hasFear && hasDoubt) {
            console.log("      ⚠️ تحليل ذكي: رصد نمط (Insecurity) - الخوف يولد رغبة مفرطة في التأكد.");
            insights.push({
                type: 'insecurity_pattern',
                description: 'الشعور بعدم الأمان يؤدي إلى الشك المستمر في المحيط.',
                confidence: 0.8
            });
        }

        return insights;
    }

    // =============================================================================
    // 🧠 3. حقن التحيز العاطفي (Emotion Bias Injection)
    // =============================================================================
    _injectEmotionBias(concepts, emotionProfile) {
        if (!emotionProfile) return concepts;
        console.log(`   🔍 [Step 3: Emotion Bias] جاري تعديل أوزان المفاهيم بناءً على عاطفة [${emotionProfile.primaryEmotion?.name}]...`);

        const boosted = { ...concepts };
        const primary = emotionProfile.primaryEmotion?.name;

        if (primary === 'fear' || primary === 'anxiety') {
            console.log("      ⚡ الخوف مرتفع: تم زيادة وزن المفاهيم بنسبة 20% (حالة استنفار).");
            Object.keys(boosted).forEach(k => boosted[k] *= 1.2);
        }

        if (primary === 'anger') {
            console.log("      ⚡ الغضب مرتفع: تم زيادة تركيز المفاهيم بنسبة 10% (حالة دفاعية).");
            Object.keys(boosted).forEach(k => boosted[k] *= 1.1);
        }

        return boosted;
    }

    // =============================================================================
    // 🔍 4. البحث عن الأنماط والتوترات (Patterns & Tensions)
    // =============================================================================
    _findPatternsAndTensions(conceptProfile = {}) {
        console.log("   🔍 [Step 4: Pattern Matching] جاري مطابقة المفاهيم مع القاموس التاسع (Patterns)...");
        const presentConcepts = Object.keys(conceptProfile);

        // البحث في CAUSAL_PATTERNS_V6
        const detectedPatterns = this.patternsDict.findPatternsByConcepts ?
            this.patternsDict.findPatternsByConcepts(presentConcepts, this.patternsDict.CAUSAL_PATTERNS_V6) : [];

        if (detectedPatterns.length > 0) {
            console.log(`      ✅ تم العثور على نمط سببي: [${detectedPatterns[0].pattern_id}]`);
        }

        // البحث في التوترات السردية (Narrative Tensions)
        console.log("      🔍 جاري فحص الصراعات الداخلية (Tensions)...");
        const detectedTensions = [];
        const tensionsList = this.patternsDict.NARRATIVE_TENSIONS_V6 || [];

        for (const tension of tensionsList) {
            const poleA_present = tension.pole_a.concepts.some(c => presentConcepts.includes(c));
            const poleB_present = tension.pole_b.concepts.some(c => presentConcepts.includes(c));

            if (poleA_present && poleB_present) {
                const poleA_strength = tension.pole_a.concepts.reduce((sum, c) => sum + (conceptProfile[c] || 0), 0);
                const poleB_strength = tension.pole_b.concepts.reduce((sum, c) => sum + (conceptProfile[c] || 0), 0);
                
                console.log(`      ⚖️ صراع مكتشف: [${tension.pole_a.name}] ↔ [${tension.pole_b.name}]`);
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
    // 🧠 5. توليد الفرضيات النفسية (Core Hypotheses)
    // =============================================================================
    _generateCoreHypotheses(topPattern, topTension, conceptProfile, metaInsights) {
        console.log("   🔍 [Step 5: Hypothesis] بناء الفرضية النهائية للحالة النفسية...");
        const hypotheses = [];

        if (topPattern) {
            // محاولة ربط النمط بالقيم (من القاموس الثاني)
            const analysis = this.behaviorValuesDict.analyzeUserProfile(
                topPattern.trigger_concepts.concat(topPattern.resulting_concepts)
            );

            const topValue = analysis.topValues?.[0];

            if (topValue) {
                const valueData = this.behaviorValuesDict.VALUE_SYSTEMS[topValue.key];
                console.log(`      💡 فرضية: السلوك ناتج عن تهديد لقيمة [${valueData?.value || topValue.key}].`);
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
                statement: `المستخدم يمر بصراع بين '${topTension.pole_a.name}' و '${topTension.pole_b.name}'.`,
                confidence: 0.85
            });
        }

        // إضافة الرؤى العميقة كفرضيات
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
    // 🚀 العملية الرئيسية (MAIN ANALYSIS)
    // =============================================================================
    analyze({ semanticMap, emotionProfile }) {
        console.log("\n--- 🧬 [SynthesisEngine] INITIATING DEEP SYNTHESIS ---");

        if (!semanticMap) {
            console.error("❌ [SynthesisEngine] SemanticMap مفقود، لا يمكن إكمال التحليل.");
            return { error: "Invalid input: SemanticMap is required." };
        }

        // 1. إثراء المفاهيم
        const enrichedConcepts = this._enrichConcepts(semanticMap);

        // 2. حقن العواطف
        const conceptProfile = this._injectEmotionBias(enrichedConcepts, emotionProfile);

        // 3. المعاني الخفية
        const metaInsights = this._detectMetaMeaning(conceptProfile);

        // 4. الأنماط والتوترات
        const { topPattern, topTension, allPatterns, allTensions } =
            this._findPatternsAndTensions(conceptProfile);

        // 5. بناء الفرضيات
        const hypotheses = this._generateCoreHypotheses(
            topPattern,
            topTension,
            conceptProfile,
            metaInsights
        );

        console.log("--- ✅ [SynthesisEngine] SYNTHESIS COMPLETE ---");

        return {
            dominantPattern: topPattern,
            coreConflict: topTension,
            cognitiveHypotheses: hypotheses,
            metaInsights,

            narrative: {
                shadow: topPattern?.description || "لم يتم رصد نمط سلبي واضح.",
                light: topTension?.description || "لم يتم رصد صراع قيمي واضح."
            },

            intelligence: {
                depthLevel: 'HIGH',
                detectedSignals: metaInsights.length,
                emotionalBias: emotionProfile?.primaryEmotion?.name || 'neutral'
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
