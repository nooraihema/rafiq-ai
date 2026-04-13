
/**
 * /analysis_engines/emotion_engine.js
 * EmotionEngine v5.0 - Affective State Model (VAD Edition)
 * التغيير الجوهري: الانتقال من التصنيف المسطح إلى النمذجة الفراغية للحالة النفسية.
 */

import { normalizeArabic, tokenize } from '../core/utils.js';

export class EmotionEngine {
    constructor(dictionaries = {}) {
        console.log("%c💓 [EmotionEngine v5.0] جاري تشغيل محرك نمذجة الحالة النفسية...", "color: #E91E63; font-weight: bold;");

        this.anchors = dictionaries.EMOTIONAL_ANCHORS?.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS || {};
        this.intensityModifers = dictionaries.INTENSITY_ANALYZER?.HIERARCHICAL_MODIFIERS || dictionaries.INTENSITY_ANALYZER || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};

        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes) ? rawPrefixes.map(p => p.value).sort((a,b) => b.length - a.length) : [];

        // خريطة أبعاد المشاعر الأساسية (V: Valence, A: Arousal, D: Dominance)
        // نطاق القيم من -1 إلى 1
        this.VAD_MAP = {
            sadness:     { v: -0.6, a: -0.2, d: -0.4 },
            depression:  { v: -0.9, a: -0.8, d: -0.9 }, // طاقة منخفضة جداً + عجز تام
            anxiety:     { v: -0.7, a: 0.8,  d: -0.6 }, // طاقة عالية (توتر) + عدم سيطرة
            anger:       { v: -0.5, a: 0.9,  d: 0.7  }, // طاقة عالية + شعور بالقوة
            joy:         { v: 0.8,  a: 0.6,  d: 0.6  },
            hopelessness:{ v: -0.9, a: -0.6, d: -0.8 },
            neutral:     { v: 0.0,  a: 0.0,  d: 0.0  }
        };

        console.log(`✅ [EmotionEngine] تم تحميل ${Object.keys(this.anchors).length} مرساة. نظام VAD نشط.`);
    }

    async analyze(rawText, context = {}) {
        console.log("\n" + "%c💓 [Affective State Modeling] START".repeat(1), "background: #E91E63; color: #fff; padding: 2px 5px;");
        
        try {
            const normalized = normalizeArabic(rawText.toLowerCase());
            const tokens = tokenize(normalized);

            // 1. استخراج العواطف الخام وجمع أبعاد VAD الخاصة بها
            const emotionalData = this._extractDetailedEmotions(tokens);

            // 2. حساب نموذج الحالة العاطفية الموحد (The Unified State Model)
            const stateModel = this._calculateStateModel(emotionalData);

            // 3. تعديل الأبعاد بناءً على "المشددات" (جداً، الشديد، شوية)
            const refinedModel = this._applyIntensityToModel(normalized, tokens, stateModel);

            // 4. تحديد "البصمة النفسية" (Psychological Fingerprint)
            const fingerprint = this._generateFingerprint(refinedModel);

            console.log(`   ✅ [Analysis Complete] State: ${fingerprint.label} | V: ${refinedModel.v.toFixed(2)} A: ${refinedModel.a.toFixed(2)} D: ${refinedModel.d.toFixed(2)}`);

            return {
                stateModel: refinedModel,
                primaryEmotion: { name: fingerprint.label, score: fingerprint.intensity },
                intensity: { overall: fingerprint.intensity },
                riskIndicators: { level: this._assessRisk(refinedModel) },
                _meta: { timestamp: new Date().toISOString(), version: "5.0-VAD" }
            };

        } catch (err) {
            console.error("❌ [EmotionEngine] Error in analysis:", err);
            return { primaryEmotion: { name: 'neutral', score: 0.3 } };
        }
    }

    /**
     * استخراج العواطف وربطها بأبعاد الـ VAD
     */
    _extractDetailedEmotions(tokens) {
        console.log("   🔍 [1/8] Mapping Tokens to VAD Space...");
        const matches = [];
        
        const ngrams = [...tokens];
        for (let i = 0; i < tokens.length - 1; i++) ngrams.push(`${tokens[i]} ${tokens[i+1]}`);

        ngrams.forEach(phrase => {
            const stem = this._stem(phrase);
            const entry = this.anchors[phrase] || this.anchors[stem];

            if (entry && entry.mood_scores) {
                const primaryKey = Object.keys(entry.mood_scores)[0];
                const vadBase = this.VAD_MAP[primaryKey] || this.VAD_MAP.neutral;
                
                console.log(`      🔥 [Match]: "${phrase}" -> [${primaryKey}] (VAD: ${vadBase.v}, ${vadBase.a}, ${vadBase.d})`);
                matches.push({ key: primaryKey, vad: vadBase, weight: entry.intensity || 1 });
            }
        });
        return matches;
    }

    /**
     * حساب المتوسط المرجح للأبعاد لإنتاج "نقطة واحدة" في الفراغ العاطفي
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

        return {
            v: totalV / totalWeight,
            a: totalA / totalWeight,
            d: totalD / totalWeight
        };
    }

    /**
     * تعديل الأبعاد بناءً على المشددات اللغوية
     */
    _applyIntensityToModel(text, tokens, model) {
        console.log("   🔍 [3/8] Refining Model with Language Modifiers...");
        let multiplier = 1.0;

        for (const [group, layers] of Object.entries(this.intensityModifers)) {
            if (typeof layers !== 'object') continue;
            for (const [layer, words] of Object.entries(layers)) {
                for (const [word, data] of Object.entries(words)) {
                    const cleanWord = normalizeArabic(word);
                    const isPresent = (cleanWord.length > 2) ? text.includes(cleanWord) : tokens.includes(cleanWord);

                    if (isPresent) {
                        const m = data.multiplier || 1.1;
                        multiplier *= m;
                        console.log(`      ⬆️ [Mod]: "${cleanWord}" (+${m}x)`);
                    }
                }
            }
        }

        // المشددات تؤثر على القيمة (V) بالابتعاد عن الصفر، وتؤثر على التنشيط (A)
        return {
            v: Math.max(-1, Math.min(1, model.v * (multiplier * 0.8))),
            a: Math.max(-1, Math.min(1, model.a * multiplier)),
            d: Math.max(-1, Math.min(1, model.d * (1/multiplier))) // الشدة العالية غالباً تقلل الشعور بالسيطرة
        };
    }

    /**
     * تصنيف الحالة النهائية بناءً على مكانها في "مكعب VAD"
     */
    _generateFingerprint(model) {
        let label = "neutral";
        const { v, a, d } = model;

        // منطق الاستنتاج (Inference Logic)
        if (v < -0.4) {
            if (a < -0.3) label = "lethargic_depression"; // طاقة منخفضة + حزن = اكتئاب خامل
            else if (a > 0.4) label = "agitated_distress"; // طاقة عالية + حزن = ضيق قلق
            else label = "sadness";
        } else if (v > 0.4) {
            label = "happiness";
        }

        if (d < -0.6) label += "_with_helplessness"; // إضافة صفة العجز

        const intensity = Math.sqrt(v*v + a*a + d*d) / 1.73; // حساب المسافة الإجمالية من المركز

        return { label, intensity: Math.min(1, intensity) };
    }

    _assessRisk(model) {
        // حزن عميق (V منخفض) + طاقة منعدمة (A منخفض) + عجز (D منخفض) = خطر اكتئاب شديد
        if (model.v < -0.7 && model.a < -0.4 && model.d < -0.6) {
            console.log("   ⚠️ [Risk]: اكتشاف نمط 'الانهيار الصامت' (High Risk)");
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
