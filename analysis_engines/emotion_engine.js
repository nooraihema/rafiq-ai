
/**
 * /analysis_engines/emotion_engine.js
 * EmotionEngine v6.0 - Cognitive Field Integration (VAD Edition)
 * وظيفته: بناء بصمة نفسية ثلاثية الأبعاد (VAD) مدعومة بوزن الانتباه واستشعار المجال الدلالي.
 */

import { normalizeArabic, tokenize } from '../core/utils.js';

export class EmotionEngine {
    constructor(dictionaries = {}) {
        console.log("%c💓 [EmotionEngine v6.0] تهيئة محرك النمذجة الموجه بالانتباه والاستشعار المتبادل...", "color: #E91E63; font-weight: bold;");

        // 1. ربط القواميس المركزية
        this.anchors = dictionaries.EMOTIONAL_ANCHORS?.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS || {};
        this.intensityModifers = dictionaries.INTENSITY_ANALYZER?.HIERARCHICAL_MODIFIERS || dictionaries.INTENSITY_ANALYZER || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};

        // 2. تجهيز أدوات التجذير
        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes) ? rawPrefixes.map(p => p.value).sort((a,b) => b.length - a.length) : [];

        // 3. خريطة إحداثيات VAD (المرجع النفسي العالمي)
        this.VAD_MAP = {
            sadness:     { v: -0.6, a: -0.2, d: -0.4 },
            depression:  { v: -0.9, a: -0.7, d: -0.9 }, // خمول + عجز
            anxiety:     { v: -0.7, a: 0.8,  d: -0.6 }, // استنفار + عدم سيطرة
            anger:       { v: -0.5, a: 0.9,  d: 0.7  }, // استنفار + قوة
            joy:         { v: 0.8,  a: 0.6,  d: 0.6  },
            hopelessness:{ v: -0.9, a: -0.5, d: -0.8 },
            neutral:     { v: 0.0,  a: 0.0,  d: 0.0  }
        };

        console.log("✅ [EmotionEngine] نظام حقن الانتباه والاستشعار المشترك (Shared Cognition) مفعل.");
    }

    /**
     * التحليل الرئيسي: إثراء الـ Workspace بالبصمة العاطفية مع استشعار المجال الدلالي
     */
    async analyze(workspace, context = {}) {
        console.log("\n" + "%c💓 [Affective Modeling] STARTING ENRICHMENT...".repeat(1), "background: #E91E63; color: #fff; padding: 2px 5px;");
        
        if (!workspace || !workspace.rawText) {
            console.error("❌ [EmotionEngine]: الـ Workspace مفقود أو لا يحتوي على نص خام.");
            return;
        }

        try {
            const rawText = workspace.rawText;
            const normalized = normalizeArabic(rawText.toLowerCase());
            const tokens = tokenize(normalized);
            
            // استلام خريطة الانتباه من الـ Workspace
            const attentionMap = workspace.attentionMap || {};
            console.log(`   🔸 [Salience Map Injected]: جاري دمج أوزان الانتباه لـ ${tokens.length} كلمات.`);

            // =========================================================
            // 🧠 النقلة النوعية: الاستشعار المشترك (Mutual Sensing)
            // =========================================================
            // المحرك "يستشعر" ما اكتشفه المحرك الدلالي (Semantic) سابقاً في الـ Workspace
            const semanticBias = this._calculateSemanticBias(workspace);
            if (semanticBias.force > 0) {
                console.log(`   🔸 [Mutual Sensing]: تم رصد انحياز دلالي نحو [${workspace.state.dominantConcept}] بقوة (${semanticBias.force.toFixed(2)})`);
            }

            // 1. استخراج المشاعر الخام وربطها بالـ VAD مع دمج (القاموس + الانتباه + الانحياز الدلالي)
            const emotionalData = this._extractWeightedEmotions(tokens, attentionMap, semanticBias);
            
            // 2. بناء مسرد العواطف المكتشفة (للمحركات التالية)
            const detectedEmotionsMap = {};
            emotionalData.forEach(item => { if(item.key) detectedEmotionsMap[item.key] = true; });

            // 3. حساب النموذج العاطفي (النقطة المركزية في الفضاء النفسي)
            const stateModel = this._calculateWeightedStateModel(emotionalData);

            // 4. تطبيق مشددات اللغة وتعديل المسار
            const refinedModel = this._applyIntensityToModel(normalized, tokens, stateModel);

            // 5. تصنيف البصمة (The Fingerprint)
            const fingerprint = this._generateFingerprint(refinedModel);

            // =========================================================
            // 🚀 حقن النتائج في الـ Workspace (إكمال نسيج المعنى الموحد)
            // =========================================================
            workspace.emotion = {
                stateModel: refinedModel,
                primaryEmotion: { name: fingerprint.label, score: fingerprint.intensity },
                intensity: { overall: fingerprint.intensity },
                detectedEmotions: detectedEmotionsMap,
                attentionContribution: attentionMap,
                riskIndicators: { level: this._assessRisk(refinedModel) },
                _meta: { timestamp: new Date().toISOString(), version: "6.0-Shared-Cognition" }
            };

            // تحديث حالة الـ Workspace الكلية لتوجيه محرك الاستدلال (Reasoning)
            workspace.state.globalMood = fingerprint.label;
            workspace.state.energyLevel = refinedModel.a; // الـ Arousal يمثل مستوى الطاقة اللحظي

            console.log(`   ✅ [Modeling Success] State: ${fingerprint.label}`);
            console.log(`      📊 Coordinates -> V: ${refinedModel.v.toFixed(2)}, A: ${refinedModel.a.toFixed(2)}, D: ${refinedModel.d.toFixed(2)}`);

        } catch (err) {
            console.error("❌ [EmotionEngine Error]:", err);
        }
    }

    /**
     * وظيفة الاستشعار: قراءة ما كتبه المحرك الدلالي لتعديل حساسية المشاعر
     */
    _calculateSemanticBias(workspace) {
        const dominant = workspace.state.dominantConcept || "neutral";
        const impact = workspace.state.semanticImpact || 0;

        // إذا كان السيمانتيك قد رصد اكتئاباً أو عجزاً، فإن المحرك العاطفي يشحن الـ Valence بالسالب مسبقاً
        if (["depression_symptom", "helplessness", "sadness", "self_blame"].includes(dominant)) {
            return { type: "NEGATIVE_CLINICAL", force: impact * 0.4 };
        }
        return { type: "NEUTRAL", force: 0 };
    }

    /**
     * استخراج المشاعر وحساب وزنها النهائي بناءً على (وزن القاموس + وزن الانتباه + الانحياز الدلالي)
     */
    _extractWeightedEmotions(tokens, attentionMap, semanticBias) {
        console.log("   🔍 [Step 1: Weighted Extraction] دمج الانتباه مع الانحياز الدلالي المكتشف...");
        const matches = [];
        const ngrams = [...tokens];
        for (let i = 0; i < tokens.length - 1; i++) ngrams.push(`${tokens[i]} ${tokens[i+1]}`);

        ngrams.forEach(phrase => {
            const stem = this._stem(phrase);
            const entry = this.anchors[phrase] || this.anchors[stem];

            if (entry && entry.mood_scores) {
                const primaryKey = Object.keys(entry.mood_scores)[0];
                let vadBase = { ...this.VAD_MAP[primaryKey] || this.VAD_MAP.neutral };
                
                // حقن الانحياز الدلالي (Shared Cognition):
                // لو السيمانتيك لقى حالة سريرية، الـ VAD بيتحرك ناحيتها تلقائياً لزيادة دقة الرنين
                if (semanticBias.type === "NEGATIVE_CLINICAL" && vadBase.v < 0) {
                    vadBase.v = Math.max(-1, vadBase.v - semanticBias.force);
                }

                // حساب معامل الانتباه (نفس المنطق السابق)
                const words = phrase.split(' ');
                const attentionFactor = words.reduce((s, w) => s + (attentionMap[w] || 0.5), 0) / words.length;
                
                // المعادلة: الوزن = (شدة الكلمة في القاموس) * (1 + وزن الانتباه المرجح)
                const finalWeight = (entry.intensity || 1) * (1 + attentionFactor * 2);

                console.log(`      🔥 [Focus Match]: "${phrase}" -> [${primaryKey}] | Weight: ${finalWeight.toFixed(2)}`);
                
                matches.push({ key: primaryKey, vad: vadBase, weight: finalWeight });
            }
        });
        return matches;
    }

    /**
     * حساب متوسط الإحداثيات المرجح (نفس المنطق السابق)
     */
    _calculateWeightedStateModel(data) {
        if (data.length === 0) return { v: 0, a: 0, d: 0 };

        let totalV = 0, totalA = 0, totalD = 0, totalWeight = 0;
        data.forEach(item => {
            totalV += item.vad.v * item.weight;
            totalA += item.vad.a * item.weight;
            totalD += item.vad.d * item.weight;
            totalWeight += item.weight;
        });

        return {
            v: totalV / totalWeight,
            a: totalA / totalWeight,
            d: totalD / totalWeight
        };
    }

    /**
     * تطبيق مشددات اللغة (نفس المنطق السابق)
     */
    _applyIntensityToModel(text, tokens, model) {
        console.log("   🔍 [Modifier Analysis] جاري البحث عن مشددات الشدة...");
        let multiplier = 1.0;

        for (const [group, layers] of Object.entries(this.intensityModifers)) {
            if (typeof layers !== 'object') continue;
            for (const [layer, words] of Object.entries(layers)) {
                for (const [word, data] of Object.entries(words)) {
                    const cw = normalizeArabic(word);
                    const isPresent = (cw.length > 2) ? text.includes(cw) : tokens.includes(cw);

                    if (isPresent) {
                        const m = data.multiplier || 1.2;
                        multiplier *= m;
                        console.log(`      ⬆️ [Mod Found]: "${cw}" (+${m}x)`);
                    }
                }
            }
        }

        return {
            v: Math.max(-1, Math.min(1, model.v * (multiplier * 0.8))),
            a: Math.max(-1, Math.min(1, model.a * multiplier)),
            d: Math.max(-1, Math.min(1, model.d * (1/multiplier))), 
            appliedMultiplier: multiplier
        };
    }

    /**
     * تصنيف البصمة النهائية (نفس المنطق السابق)
     */
    _generateFingerprint(model) {
        const { v, a, d } = model;
        let label = "neutral";

        if (v < -0.3) {
            if (a < -0.2) label = "lethargic_depression"; 
            else if (a > 0.4) label = "agitated_distress"; 
            else label = "sadness";
        } else if (v > 0.4) {
            label = "happiness";
        }

        if (d < -0.5 && v < -0.4) {
            label += "_with_helplessness";
        }

        const intensity = Math.sqrt(v*v + a*a + d*d) / 1.73; 

        return { label, intensity: Math.min(1, intensity) };
    }

    /**
     * تحديد مستوى الخطر (نفس المنطق السابق)
     */
    _assessRisk(m) {
        if (m.v < -0.7 && m.a < -0.4 && m.d < -0.6) {
            console.log("   🚨 [Risk Alert]: تم اكتشاف مؤشرات 'انهيار نفسي'!");
            return "CRITICAL";
        }
        return "LOW";
    }

    _stem(token) {
        if (!token || typeof token !== 'string') return "";
        for (const p of this.prefixes) {
            if (token.startsWith(p) && token.length > p.length + 2) {
                const s = token.substring(p.length);
                if (this.anchors[s]) return s;
            }
        }
        return token;
    }
}

export default EmotionEngine;
