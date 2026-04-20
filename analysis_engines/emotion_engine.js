
/**
 * /analysis_engines/emotion_engine.js
 * EmotionEngine v7.0 - [GOLD PLATE MODELING EDITION]
 * وظيفته: تحويل ذرات العواطف من طبق الذهب إلى نموذج VAD ثلاثي الأبعاد وبصمة عاطفية.
 */

export class EmotionEngine {
    constructor() {
        console.log("%c💓 [EmotionEngine v7.0] تهيئة محرك النمذجة العاطفية لطبق الذهب...", "color: #E91E63; font-weight: bold;");

        // خارطة القيم الافتراضية لأبعاد (التبدل، الاستثارة، السيطرة)
        this.VAD_MAP = {
            sadness:      { v: -0.6, a: -0.2, d: -0.4 },
            depression:   { v: -0.9, a: -0.7, d: -0.9 },
            anxiety:      { v: -0.7, a: 0.8,  d: -0.6 },
            anger:        { v: -0.5, a: 0.9,  d: 0.7  },
            joy:          { v: 0.8,  a: 0.6,  d: 0.6  },
            fear:         { v: -0.8, a: 0.8,  d: -0.8 },
            loneliness:   { v: -0.5, a: -0.3, d: -0.5 },
            neutral:      { v: 0.0,  a: 0.0,  d: 0.0  }
        };
    }

    async analyze(workspace, context = {}) {
        const goldPlate = workspace.goldPlate;
        if (!goldPlate) {
            console.error("❌ [EmotionEngine]: طبق الذهب مفقود. المحرك العاطفي لا يمكنه العمل بدون بيانات مفتتة.");
            return;
        }

        try {
            console.log("\n%c[Emotion Modeling v7.0] EXTRACTING VAD FROM GOLD PLATE...", "background:#E91E63;color:#fff;");

            // 1. حساب الانحياز الدلالي (لو العقل لقى حاجة خطيرة، القلب لازم يتأثر)
            const semanticBias = this._calculateSemanticBias(workspace);

            // 2. استخراج بيانات VAD الموزونة من العقد
            const emotionalMatches = this._extractVADData(goldPlate, semanticBias);

            // 3. بناء النموذج الرياضي المبدئي
            let stateModel = this._calculateStateModel(emotionalMatches);

            // 4. تطبيق الشدة الكلية (Intensity) المستخرجة من طبق الذهب
            stateModel = this._applyGlobalIntensity(stateModel, goldPlate.summary.globalIntensity);

            // 5. توليد البصمة النهائية (Fingerprint)
            const fingerprint = this._generateFingerprint(stateModel, semanticBias, goldPlate.summary.compositeState);

            // =====================================================
            // 🚀 حقن النتائج النهائية في الـ Workspace
            // =====================================================
            workspace.emotion = {
                stateModel,
                primaryEmotion: { name: fingerprint.label, score: fingerprint.confidence },
                intensity: { overall: goldPlate.summary.globalIntensity },
                detectedEmotions: goldPlate.summary.primaryEmotions,
                riskIndicators: { level: this._assessRisk(stateModel) },
                _meta: { version: "7.0-Gold-Plate-Ready" }
            };

            // تحديث الحالة العالمية للفضاء
            workspace.state.globalMood = fingerprint.label;
            workspace.state.energyLevel = stateModel.a;

            console.log(`   ✅ [Emotion Complete] Mood: ${fingerprint.label} | Energy: ${stateModel.a.toFixed(2)}`);

        } catch (err) {
            console.error("❌ [EmotionEngine Error]:", err);
        }
    }

    /**
     * يستخرج قيم VAD من كل عقدة في طبق الذهب
     */
    _extractVADData(plate, bias) {
        const results = [];

        plate.nodes.forEach(node => {
            if (!node.emotion) return;

            const emoName = node.emotion.name;
            let vadBase = { ...(this.VAD_MAP[emoName] || this.VAD_MAP.neutral) };

            // حقن الانحياز الدلالي: لو فيه اكتئاب دلالي، نغرق قيم التبدل (Valence)
            if (bias.force > 0) {
                vadBase.v -= bias.force * 0.5;
                vadBase.a -= bias.force * 0.3;
            }

            // الوزن يعتمد على: (قوة الكلمة في القاموس * هل هي منفية؟)
            const nodeWeight = (node.emotion.intensity || 1.0) * (node.isNegated ? 0.5 : 1.2);

            results.push({ vad: vadBase, weight: nodeWeight });
        });

        return results;
    }

    /**
     * دمج القيم العاطفية في نموذج واحد (متوسط موزون)
     */
    _calculateStateModel(matches) {
        if (!matches.length) return { v: -0.1, a: -0.1, d: -0.1 }; // حالة سكون افتراضية

        let v = 0, a = 0, d = 0, totalW = 0;

        matches.forEach(m => {
            v += m.vad.v * m.weight;
            a += m.vad.a * m.weight;
            d += m.vad.d * m.weight;
            totalW += m.weight;
        });

        return { v: v / totalW, a: a / totalW, d: d / totalW };
    }

    /**
     * تعديل الأبعاد بناءً على المؤكدات والمضاعفات (جداً، خالص، إلخ)
     */
    _applyGlobalIntensity(model, intensity) {
        return {
            v: Math.max(-1, Math.min(1, model.v)), // التبدل لا يتأثر بالشدة طردياً دائماً
            a: Math.max(-1, Math.min(1, model.a * intensity)), // الاستثارة تزيد مع الشدة
            d: Math.max(-1, Math.min(1, model.d * (1/intensity))), // السيطرة تقل غالباً مع زيادة الشدة
            multiplier: intensity
        };
    }

    /**
     * تصنيف الحالة النهائية بناءً على إحداثيات VAD
     */
    _generateFingerprint(model, bias, composite) {
        const { v, a, d } = model;
        let label = "neutral";

        // منطق التصنيف الفراغي
        if (v < -0.3) {
            if (a < -0.2) label = "lethargic_depression";
            else if (a > 0.4) label = "agitated_anxiety";
            else label = "sadness";
        } else if (v > 0.4) {
            label = "joy_contentment";
        }

        // إعطاء الأولوية للحالة المركبة المكتشفة في طبق الذهب (مثل المرارة أو الاحتراق)
        if (composite) {
            label = `composite:${composite.name}`;
        }

        // لو فيه انحياز إكلينيكي قوي
        if (bias.force > 0.7 && v < 0) {
            label = "clinical_distress";
        }

        return {
            label,
            confidence: Math.min(1, (Math.abs(v) + Math.abs(a)) / 1.5)
        };
    }

    _calculateSemanticBias(workspace) {
        const impact = workspace.state.semanticImpact || 0;
        const dominant = workspace.state.dominantConcept;
        
        // إذا اكتشف المحرك الدلالي مفاهيم ثقيلة
        const isCritical = ["depression_symptom", "helplessness", "self_blame"].includes(dominant);
        
        return {
            force: isCritical ? Math.min(1.0, impact / 5) : 0,
            target: dominant
        };
    }

    _assessRisk(m) {
        if (m.v < -0.8 && m.a < -0.6) return "CRITICAL";
        if (m.v < -0.5) return "MODERATE";
        return "LOW";
    }
}

export default EmotionEngine;

