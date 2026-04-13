
/**
 * /analysis_engines/emotion_engine.js
 * EmotionEngine v5.2 - Affective State Model (VAD Edition)
 * نظام النمذجة النفسية ثلاثية الأبعاد مع نظام حماية البيانات (Data Integrity)
 */

import { normalizeArabic, tokenize } from '../core/utils.js';

export class EmotionEngine {
    constructor(dictionaries = {}) {
        console.log("%c💓 [EmotionEngine v5.2] تهيئة محرك النمذجة النفسية...", "color: #E91E63; font-weight: bold;");

        // 1. ربط القواميس المركزية
        this.anchors = dictionaries.EMOTIONAL_ANCHORS?.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS || {};
        this.intensityModifers = dictionaries.INTENSITY_ANALYZER?.HIERARCHICAL_MODIFIERS || dictionaries.INTENSITY_ANALYZER || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};

        // 2. تجهيز السوابق للتجذير
        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes) ? rawPrefixes.map(p => p.value).sort((a,b) => b.length - a.length) : [];

        // 3. خريطة إحداثيات VAD (Valence, Arousal, Dominance)
        this.VAD_MAP = {
            sadness:     { v: -0.6, a: -0.2, d: -0.4 },
            depression:  { v: -0.9, a: -0.7, d: -0.9 },
            anxiety:     { v: -0.7, a: 0.8,  d: -0.6 },
            anger:       { v: -0.5, a: 0.9,  d: 0.7  },
            joy:         { v: 0.8,  a: 0.6,  d: 0.6  },
            hopelessness:{ v: -0.9, a: -0.5, d: -0.8 },
            neutral:     { v: 0.0,  a: 0.0,  d: 0.0  }
        };

        console.log(`✅ [EmotionEngine] تم تحميل ${Object.keys(this.anchors).length} مرساة. نظام الـ VAD جاهز.`);
    }

    /**
     * التحليل الرئيسي للحالة العاطفية
     */
    async analyze(rawText, context = {}) {
        console.log("\n" + "%c💓 [EmotionEngine] STARTING PIPELINE".repeat(1), "background: #E91E63; color: #fff; padding: 2px 5px;");
        
        try {
            const normalized = normalizeArabic(rawText.toLowerCase());
            const tokens = tokenize(normalized);
            console.log(`   🔸 [Step 1: Tokens] جاري معالجة ${tokens.length} كلمات.`);

            // 1. استخراج العواطف الخام وربطها بالـ VAD
            const emotionalData = this._extractDetailedEmotions(tokens);
            
            // 2. بناء قاموس العواطف المكتشفة (حيوي جداً لمحرك الردود)
            const detectedEmotionsMap = {};
            emotionalData.forEach(item => {
                if (item.key) detectedEmotionsMap[item.key] = true;
            });
            console.log(`   🔸 [Step 2: Map] العواطف المرصودة: [${Object.keys(detectedEmotionsMap).join(', ')}]`);

            // 3. حساب نقطة المركز في النموذج (State Model)
            const stateModel = this._calculateStateModel(emotionalData);

            // 4. تطبيق مشددات اللغة (Modifiers)
            const refinedModel = this._applyIntensityToModel(normalized, tokens, stateModel);

            // 5. توليد البصمة النهائية والتصنيف
            const fingerprint = this._generateFingerprint(refinedModel);

            console.log(`   ✅ [Analysis Complete] Label: ${fingerprint.label}`);
            console.log(`      📊 VAD Result -> V: ${refinedModel.v.toFixed(2)}, A: ${refinedModel.a.toFixed(2)}, D: ${refinedModel.d.toFixed(2)}`);

            return {
                stateModel: refinedModel,
                primaryEmotion: { 
                    name: fingerprint.label, 
                    score: fingerprint.intensity 
                },
                intensity: { 
                    overall: fingerprint.intensity,
                    multiplier: refinedModel.appliedMultiplier 
                },
                detectedEmotions: detectedEmotionsMap, // هذا هو المفتاح الذي يمنع انهيار CatharsisEngine
                riskIndicators: { level: this._assessRisk(refinedModel) },
                _meta: { timestamp: new Date().toISOString(), version: "5.2-VAD-Final" }
            };

        } catch (err) {
            console.error("❌ [EmotionEngine Error]:", err);
            // رداً دفاعياً (Fallback) لمنع انهيار الـ Brain
            return {
                primaryEmotion: { name: 'neutral', score: 0.3 },
                detectedEmotions: {},
                stateModel: { v: 0, a: 0, d: 0 },
                intensity: { overall: 0.3 }
            };
        }
    }

    /**
     * استخراج الكلمات العاطفية وتحويلها لإحداثيات VAD
     */
    _extractDetailedEmotions(tokens) {
        const matches = [];
        const ngrams = [...tokens];
        // إضافة الكلمات الثنائية لزيادة الدقة
        for (let i = 0; i < tokens.length - 1; i++) {
            ngrams.push(`${tokens[i]} ${tokens[i+1]}`);
        }

        ngrams.forEach(phrase => {
            const stem = this._stem(phrase);
            const entry = this.anchors[phrase] || this.anchors[stem];

            if (entry && entry.mood_scores) {
                // نأخذ العاطفة الأولى المذكورة في القاموس كعاطفة أساسية لهذه الكلمة
                const primaryKey = Object.keys(entry.mood_scores)[0];
                const vadBase = this.VAD_MAP[primaryKey] || this.VAD_MAP.neutral;
                
                console.log(`      🔥 [Match]: "${phrase}" -> [${primaryKey}]`);
                matches.push({ 
                    key: primaryKey, 
                    vad: vadBase, 
                    weight: entry.intensity || 1 
                });
            }
        });
        return matches;
    }

    /**
     * حساب متوسط الإحداثيات بناءً على كل الكلمات المكتشفة
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
     * تعديل الإحداثيات بناءً على كلمات مثل (جداً، الشديد، قليلاً)
     */
    _applyIntensityToModel(text, tokens, model) {
        console.log("   🔍 [Modifier Analysis] جاري البحث عن مشددات الشدة...");
        let multiplier = 1.0;

        for (const [group, layers] of Object.entries(this.intensityModifers)) {
            if (typeof layers !== 'object') continue;
            for (const [layer, words] of Object.entries(layers)) {
                for (const [word, data] of Object.entries(words)) {
                    const cw = normalizeArabic(word);
                    // التحقق من الكلمة (ككلمة كاملة في التوكنز أو نص في الجملة)
                    const isPresent = (cw.length > 2) ? text.includes(cw) : tokens.includes(cw);

                    if (isPresent) {
                        const m = data.multiplier || 1.2;
                        multiplier *= m;
                        console.log(`      ⬆️ [Mod Found]: "${cw}" (+${m}x)`);
                    }
                }
            }
        }

        // تطبيق الشدة على الأبعاد:
        // الشدة العالية تبعد الـ Valence عن الصفر وتزيد الـ Arousal
        return {
            v: Math.max(-1, Math.min(1, model.v * (multiplier * 0.8))),
            a: Math.max(-1, Math.min(1, model.a * multiplier)),
            d: Math.max(-1, Math.min(1, model.d * (1/multiplier))), // الشدة العالية تزيد الشعور بالعجز
            appliedMultiplier: multiplier
        };
    }

    /**
     * تصنيف الحالة النهائية بناءً على موقعها في مكعب الـ VAD
     */
    _generateFingerprint(model) {
        const { v, a, d } = model;
        let label = "neutral";

        // منطق التصنيف الاستنتاجي:
        if (v < -0.3) {
            if (a < -0.2) label = "lethargic_depression"; // حزن + خمول
            else if (a > 0.4) label = "agitated_distress"; // حزن + توتر
            else label = "sadness";
        } else if (v > 0.4) {
            label = "happiness";
        }

        // إضافة وسم العجز إذا كانت السيطرة منخفضة
        if (d < -0.5 && v < -0.4) {
            label += "_with_helplessness";
        }

        // حساب الشدة الإجمالية (المسافة من نقطة الصفر)
        const intensity = Math.sqrt(v*v + a*a + d*d) / 1.73; 

        return { label, intensity: Math.min(1, intensity) };
    }

    /**
     * تحديد مستوى الخطر بناءً على عمق الحالة
     */
    _assessRisk(m) {
        // حزن شديد + خمول شديد + عجز شديد = حالة حرجة
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
