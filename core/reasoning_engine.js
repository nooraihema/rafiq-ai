
/**
 * /core/reasoning_engine.js
 * ReasoningEngine v2.0 - The Strategic Intelligence Hub
 * وظيفته: الربط المنطقي بين الانتباه، إحداثيات VAD، والمفاهيم السريرية لاتخاذ قرار استراتيجي.
 */

export class ReasoningEngine {
    constructor(memorySystem) {
        this.memory = memorySystem;
        this.STRICTNESS_THRESHOLD = 0.75; // عتبة اليقين لاتخاذ قرارات حازمة
    }

    /**
     * المهمة الكبرى: صياغة الخلاصة الاستراتيجية (The Strategic Insight)
     */
    async computeStrategicInsight(analysis) {
        console.log("\n" + "%c🧠 [Reasoning Engine] بدأت عملية الاستدلال الاستراتيجي...".repeat(1), "background: #607D8B; color: #fff; padding: 2px 5px;");

        const { emotionProfile, semanticMap, attentionMap, synthesisProfile } = analysis;

        // 1. حساب معامل اليقين (Diagnostic Certainty)
        // نقوم بمطابقة بؤرة الانتباه مع بؤرة المفهوم الدلالي
        const diagnosticCertainty = this._evaluateCertainty(attentionMap, semanticMap);

        // 2. تحليل التوافق (Coherence Check)
        // هل ما يقوله المستخدم (Semantic) يتوافق مع ما يشعر به (VAD)؟
        const coherence = this._checkCoherence(emotionProfile.stateModel, semanticMap.clinicalFocus);

        // 3. تحديد المسار التاريخي (Trajectory Analysis)
        const trajectory = this._analyzeUserTrajectory();

        // 4. اختيار النية العليا للرد (Master Intent)
        const masterIntent = this._decideMasterIntent(emotionProfile, semanticMap, synthesisProfile, trajectory);

        // 5. بناء التوصية الجراحية (Surgical Recommendation)
        const recommendation = this._forgeRecommendation(masterIntent, synthesisProfile);

        const strategicInsight = {
            masterIntent,
            diagnosticCertainty,
            coherence,
            trajectory,
            recommendation,
            internalRationale: this._generateRationale(coherence, masterIntent, trajectory)
        };

        console.log(`   ✅ [Reasoning Complete]`);
        console.log(`      🎯 Intent: ${masterIntent.type} | Certainty: ${diagnosticCertainty.toFixed(2)}`);
        console.log(`      💡 Rationale: ${strategicInsight.internalRationale}`);

        return strategicInsight;
    }

    /**
     * يقيس مدى تطابق الانتباه اللحظي مع التشخيص الدلالي
     */
    _evaluateCertainty(attentionMap, semanticMap) {
        console.log("   🔸 [Step 1] تقييم درجة اليقين التشخيصي...");
        const topAttentionToken = Object.entries(attentionMap).sort((a,b) => b[1] - a[1])[0]?.[0];
        const topClinicalConcept = semanticMap.clinicalFocus?.id;

        let certainty = 0.5; // نقطة البداية

        // إذا كان تركيز الانتباه هو نفسه المفهوم السريري الأهم -> يقين عالٍ
        if (topClinicalConcept && topAttentionToken && topAttentionToken.includes(topClinicalConcept.substring(0,4))) {
            certainty += 0.4;
        }

        return Math.min(1, certainty);
    }

    /**
     * فحص التوافق بين "الأبعاد العاطفية" و "المصطلحات المستخدمة"
     */
    _checkCoherence(vad, clinicalFocus) {
        console.log("   🔸 [Step 2] فحص التوافق بين الأبعاد العاطفية واللغة...");
        
        const isNegativeV = vad.v < -0.4;
        const isClinicalNegative = ["depression_symptom", "sadness", "helplessness"].includes(clinicalFocus?.id);

        if (isNegativeV && isClinicalNegative) return "HIGHLY_COHERENT";
        if (!isNegativeV && isClinicalNegative) return "DISSONANT_MASKING"; // يتكلم عن حزن لكن أبعاده إيجابية (قناع)
        return "NEUTRAL";
    }

    /**
     * تحليل المسار من الذاكرة (هل المستخدم يتحسن أم يتدهور؟)
     */
    _analyzeUserTrajectory() {
        const history = this.memory?.workingMemory || [];
        if (history.length < 2) return "STABLE_NEW";

        const lastV = history[history.length - 1].insight?.emotionProfile?.stateModel?.v || 0;
        const currentV = history[history.length - 2]?.insight?.emotionProfile?.stateModel?.v || 0;

        if (currentV < lastV - 0.2) return "DETERIORATING";
        if (currentV > lastV + 0.2) return "IMPROVING";
        return "STABLE";
    }

    /**
     * اتخاذ القرار: ما هي "وضعية الرد" المثالية؟
     */
    _decideMasterIntent(emotion, semantic, synthesis, trajectory) {
        const vad = emotion.stateModel;
        
        // 1. وضعية التدخل (Crisis/Critical)
        if (vad.v < -0.8 && vad.d < -0.6) {
            return { type: "CRITICAL_VALIDATION", priority: 1 };
        }

        // 2. وضعية إعادة التأطير (Pattern Reframe)
        if (synthesis.dominantPattern && trajectory !== "DETERIORATING") {
            return { type: "STRATEGIC_REFRANE", priority: 2 };
        }

        // 3. وضعية التنشيط (Behavioral Activation)
        if (vad.a < -0.4 && semantic.clinicalFocus?.id === "depression_symptom") {
            return { type: "GENTLE_ACTIVATION", priority: 2 };
        }

        return { type: "EMPATHETIC_LISTENING", priority: 3 };
    }

    /**
     * اختيار "الأداة" المناسبة من الأنماط المكتشفة
     */
    _forgeRecommendation(intent, synthesis) {
        if (intent.type === "STRATEGIC_REFRANE" && synthesis.dominantPattern) {
            return {
                action: "EXPOSE_PATTERN",
                target: synthesis.dominantPattern.pattern_id
            };
        }
        
        if (intent.type === "GENTLE_ACTIVATION") {
            return {
                action: "MICRO_STEP",
                target: "small_wins"
            };
        }

        return { action: "VALIDATE_ONLY", target: "empathy" };
    }

    _generateRationale(coherence, intent, trajectory) {
        let text = `بناءً على التوافق الـ ${coherence}، تم اختيار وضعية ${intent.type}. `;
        if (trajectory === "DETERIORATING") text += "ملاحظة: هناك تدهور في الحالة المزاجية يتطلب حذراً أكبر.";
        return text;
    }
}

export default ReasoningEngine;
