
/**
 * /analysis_engines/emotion_engine.js
 * EmotionEngine v5.1 - Affective State Model (VAD Edition)
 * وظيفته: تحويل الكلمات إلى إحداثيات نفسية (Valence, Arousal, Dominance)
 */

import { normalizeArabic, tokenize } from '../core/utils.js';

export class EmotionEngine {
    constructor(dictionaries = {}) {
        console.log("%c💓 [EmotionEngine v5.1] جاري تشغيل محرك النمذجة النفسية...", "color: #E91E63; font-weight: bold;");

        // 1. ربط القواميس المركزية
        this.anchors = dictionaries.EMOTIONAL_ANCHORS?.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS || {};
        this.intensityModifers = dictionaries.INTENSITY_ANALYZER?.HIERARCHICAL_MODIFIERS || dictionaries.INTENSITY_ANALYZER || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};

        // 2. تجهيز السوابق للتجذير
        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes) ? rawPrefixes.map(p => p.value).sort((a,b) => b.length - a.length) : [];

        // 3. تعريف قيم الـ VAD لكل عاطفة أساسية (نطاق -1 إلى 1)
        // V: Valence (سلبي <-> إيجابي)
        // A: Arousal (خمول <-> استنفار/طاقة)
        // D: Dominance (عجز <-> سيطرة)
        this.VAD_MAP = {
            sadness:     { v: -0.6, a: -0.2, d: -0.4 },
            depression:  { v: -0.9, a: -0.7, d: -0.9 }, // عجز تام وخمول
            anxiety:     { v: -0.7, a: 0.8,  d: -0.6 }, // توتر عالٍ وعدم سيطرة
            anger:       { v: -0.5, a: 0.9,  d: 0.7  }, // طاقة عالية وشعور بالقوة
            joy:         { v: 0.8,  a: 0.6,  d: 0.6  },
            hopelessness:{ v: -0.9, a: -0.5, d: -0.8 },
            neutral:     { v: 0.0,  a: 0.0,  d: 0.0  }
        };

        console.log(`✅ [EmotionEngine] نظام VAD نشط. المراسي المحملة: ${Object.keys(this.anchors).length}`);
    }

    /**
     * التحليل الرئيسي للحالة العاطفية
     */
    async analyze(rawText, context = {}) {
        console.log("\n" + "%c💓 [Affective State Modeling] STARTING...".repeat(1), "background: #E91E63; color: #fff; padding: 2px 5px;");
        
        try {
            const normalized = normalizeArabic(rawText.toLowerCase());
            const tokens = tokenize(normalized);

            // 1. استخراج المشاعر الخام وربطها بأبعاد VAD
            const emotionalData = this._extractDetailedEmotions(tokens);
            
            // استخراج قائمة المشاعر المكتشفة (لتغذية محرك الردود ومنع الانهيار)
            const detectedEmotions = {};
            emotionalData.forEach(item => { detectedEmotions[item.key] = true; });

            // 2. حساب المتوسط المرجح للنموذج العاطفي
            const stateModel = this._calculateStateModel(emotionalData);

            // 3. تعديل الأبعاد بناءً على المشددات اللغوية (جداً، شديد...)
            const refinedModel = this._applyIntensityToModel(normalized, tokens, stateModel);

            // 4. توليد البصمة النهائية والتصنيف
            const fingerprint = this._generateFingerprint(refinedModel);

            console.log(`   ✅ [Model Success] Label: ${fingerprint.label} | Intensity: ${fingerprint.intensity.toFixed(2)}`);
            console.log(`      📊 Coordinates -> V: ${refinedModel.v.toFixed(2)}, A: ${refinedModel.a.toFixed(2)}, D: ${refinedModel.d.toFixed(2)}`);

            return {
                stateModel: refinedModel,
                primaryEmotion: { name: fingerprint.label, score: fingerprint.intensity },
                intensity: { overall: fingerprint.intensity },
                detectedEmotions: detectedEmotions, // ضروري جداً لـ CatharsisEngine
                riskIndicators: { level: this._assessRisk(refinedModel) },
                _meta: { timestamp: new Date().toISOString(), version: "5.1-VAD-Robust" }
            };

        } catch (err) {
            console.error("❌ [EmotionEngine] Critical error during modeling:", err);
            return {
                primaryEmotion: { name: 'neutral', score: 0.3 },
                detectedEmotions: {},
                stateModel: { v: 0, a: 0, d: 0 },
                intensity: { overall: 0.3 }
            };
        }
    }

    /**
     * استخراج العواطف وتحويلها إلى فضاء VAD
     */
    _extractDetailedEmotions(tokens) {
        console.log("   🔍 [1/5] Mapping Tokens to VAD Space...");
        const matches = [];
        
        // فحص الكلمات الفردية والثنائية (N-grams)
        const ngrams = [...tokens];
        for (let i = 0; i < tokens.length - 1; i++) ngrams.push(`${tokens[i]} ${tokens[i+1]}`);

        ngrams.forEach(phrase => {
            const stem = this._stem(phrase);
            const entry = this.anchors[phrase] || this.anchors[stem];

            if (entry && entry.mood_scores) {
                const primaryKey = Object.keys(entry.mood_scores)[0];
                const vadBase = this.VAD_MAP[primaryKey] || this.VAD_MAP.neutral;
                
                console.log(`      🔥 [Match]: "${phrase}" -> [${primaryKey}]`);
                matches.push({ key: primaryKey, vad: vadBase, weight: entry.intensity || 1 });
            }
        });
        return matches;
    }

    /**
     * حساب نقطة المركز للحالة العاطفية
     */
    _calculateStateModel(data) {
        if (data.length === 0) return { v: 0, a: 0, d: 0 };

        let totalV = 0, totalA = 0, totalD = 0, totalWeight = 0;
        data.forEach(item => {
            totalV += item.vad.v * item.weight;
            totalA += item.vad.a * item.weight;
            totalD += item.vad.d * item.weight;
            totalWeight += item.weight;
        });

        return { v: totalV / totalWeight, a: totalA / totalWeight, d: totalD / totalWeight };
    }

    /**
     * تطبيق المشددات (Amplifiers) لتوسيع نطاق النموذج
     */
    _applyIntensityToModel(text, tokens, model) {
        console.log("   🔍 [3/5] Applying Language Modifiers...");
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
                        console.log(`      ⬆️ [Boost]: "${word}" (+${m}x)`);
                    }
                }
            }
        }

        return {
            v: Math.max(-1, Math.min(1, model.v * (multiplier * 0.8))),
            a: Math.max(-1, Math.min(1, model.a * multiplier)),
            d: Math.max(-1, Math.min(1, model.d * (1/multiplier))) // الشدة تزيد العجز D
        };
    }

    /**
     * تصنيف الحالة بناءً على المنطقة في مكعب VAD
     */
    _generateFingerprint(model) {
        const { v, a, d } = model;
        let label = "neutral";

        if (v < -0.3) {
            if (a < -0.2) label = "lethargic_depression"; // حزن + خمول
            else if (a > 0.4) label = "agitated_distress"; // حزن + توتر
            else label = "sadness";
        } else if (v > 0.4) {
            label = "happiness";
        }

        // وسم إضافي للعجز (Helplessness)
        if (d < -0.5 && v < -0.4) label += "_with_helplessness";

        // حساب الشدة كمسافة إقليدية من المركز
        const intensity = Math.sqrt(v*v + a*a + d*d) / 1.73; 

        return { label, intensity: Math.min(1, intensity) };
    }

    _assessRisk(m) {
        // خطر حقيقي: Valence منخفض جداً (ألم) + Arousal منخفض (انسحاب) + Dominance منخفض (يأس)
        if (m.v < -0.7 && m.a < -0.4 && m.d < -0.6) {
            console.log("   ⚠️ [Risk]: تفعيل إنذار 'الانهيار الصامت'!");
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
