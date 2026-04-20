
/**
 * /analysis_engines/synthesis_engine.js
 * SynthesisEngine v4.0 - [GOLD PLATE INTEGRATION]
 * وظيفته: استهلاك "طبق الذهب" وتحويله إلى فرضيات نفسية وبصيرة كلية.
 */

export class SynthesisEngine {
    constructor(dictionaries) {
        console.log("%c🧬 [SynthesisEngine v4.0] تهيئة المحلل الاستراتيجي لطبق الذهب...", "color: #4CAF50; font-weight: bold;");
        
        // القواميس هنا تستخدم فقط للمرجعية العميقة عند صياغة الفرضيات
        this.patternsDict = dictionaries.PATTERNS;
        this.behaviorValuesDict = dictionaries.BEHAVIOR_VALUES;
    }

    /**
     * العملية الرئيسية: قراءة طبق الذهب من الفضاء الموحد وتحويله لنتائج
     */
    async analyze(workspace, context = {}) {
        console.log("\n%c[Cognitive Synthesis] STARTING GOLD-PLATE INTERPRETATION...", "background: #4CAF50; color: #fff; padding: 2px 5px;");

        // التأكد من أن طبق الذهب موجود في الفضاء الموحد
        const goldPlate = workspace.goldPlate; 
        if (!goldPlate) {
            console.error("❌ [SynthesisEngine]: طبق الذهب (Gold Plate) مفقود من الفضاء الموحد!");
            return;
        }

        try {
            // 1. استخراج الأنماط والتوترات المكتشفة مسبقاً في طبق الذهب
            const detectedPatterns = goldPlate.summary.causalChains;
            const detectedTensions = goldPlate.summary.narrativeTensions;
            const emotions = goldPlate.summary.primaryEmotions;

            // 2. إثراء المفاهيم وتعديل أوزانها بناءً على الشدة العاطفية (Heart-Mind Fusion)
            const conceptProfile = this._fuseHeartAndMind(goldPlate);

            // 3. كشف المعاني العميقة (Meta-Insights) بناءً على تداخل المفاهيم
            const metaInsights = this._generateMetaInsights(conceptProfile, goldPlate.summary.compositeState);

            // 4. توليد الفرضيات النفسية (Core Hypotheses) بربط الأنماط بالقيم
            const hypotheses = this._generateCoreHypotheses(
                detectedPatterns[0], 
                detectedTensions[0], 
                goldPlate.summary.behavioralMarkers
            );

            // =========================================================
            // 🚀 حقن النتائج النهائية في الـ Workspace
            // =========================
            workspace.synthesis = {
                dominantPattern: detectedPatterns[0] || null,
                coreConflict: detectedTensions[0] || null,
                compositeState: goldPlate.summary.compositeState,
                cognitiveHypotheses: hypotheses,
                metaInsights,
                narrative: {
                    shadow: detectedPatterns[0]?.description || "استجابة عاطفية طبيعية.",
                    light: detectedTensions[0]?.description || "لا توجد صراعات قيمية حادة حالياً."
                }
            };

            // تحديث حالة الـ Workspace لاتخاذ القرار النهائي في المحركات القادمة
            workspace.state.dominantPattern = detectedPatterns[0]?.pattern_id || "general_case";
            workspace.state.conflictDetected = !!detectedTensions.length;
            workspace.state.intelligenceDepth = hypotheses.length > 0 ? 'ULTRA' : 'HIGH';

            console.log(`   ✅ [Synthesis Complete]: تم تحليل النمط [${workspace.state.dominantPattern}] بدقة طبق الذهب.`);

        } catch (err) {
            console.error("❌ [SynthesisEngine Error]:", err);
        }
    }

    /**
     * دمج العاطفة مع المفاهيم لإنتاج "بروفايل ذهني" مشحون طاقياً
     */
    _fuseHeartAndMind(plate) {
        const profile = {};
        const intensity = plate.summary.globalIntensity;
        
        plate.detectedConcepts.forEach(c => {
            // القاعدة: كلما زادت شدة العاطفة في طبق الذهب، زاد وزن المفهوم المرتبط بها
            profile[c.id] = c.weight * intensity;
        });

        return profile;
    }

    /**
     * توليد رؤى "ما وراء المعنى"
     */
    _generateMetaInsights(conceptProfile, compositeState) {
        const insights = [];
        const ids = Object.keys(conceptProfile);

        // مثال: إذا وجدنا "اكتئاب" وفي نفس الوقت "حالة مركبة من الحزن والغضب" (مرارة)
        if (ids.includes('depression_symptom') && compositeState?.name?.includes('مرارة')) {
            insights.push({ 
                type: 'clinical_nuance', 
                description: 'الاكتئاب هنا ممزوج باستياء مكبوت (مرارة)، مما يتطلب تعاملاً مع الغضب أولاً.',
                confidence: 0.9 
            });
        }

        // رصد أنماط العجز
        if (ids.includes('helplessness') && conceptProfile['helplessness'] > 1.2) {
            insights.push({ 
                type: 'stagnation_alert', 
                description: 'المستخدم يشعر بحالة شلل في الإرادة (عجز مكتسب) عالية الشدة.',
                confidence: 0.85 
            });
        }

        return insights;
    }

    /**
     * بناء الفرضيات بربط السلوكيات المكتشفة بالقيم الأساسية
     */
    _generateCoreHypotheses(topPattern, topTension, behaviors) {
        const hypotheses = [];

        // ربط النمط السائد بالدفاعات النفسية المكتشفة في طبق الذهب
        if (topPattern && behaviors.length > 0) {
            const defense = behaviors.find(b => b.type === 'defense');
            if (defense) {
                hypotheses.push({
                    id: 'pattern_defense_link',
                    statement: `نمط '${topPattern.pattern_id}' يتم تعزيزه حالياً بواسطة آلية '${defense.name}'.`,
                    confidence: 0.8
                });
            }
        }

        // ربط التوتر الصراعي بالقيم (من قاموس القيم السلوكية)
        if (topTension) {
            hypotheses.push({
                id: 'value_conflict',
                statement: `الصراع بين ${topTension.pole_a.name} و ${topTension.pole_b.name} يسبب استنزافاً طاقياً.`,
                confidence: 0.9
            });
        }

        return hypotheses;
    }
}

export default SynthesisEngine;
