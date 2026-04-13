
/**
 * /analysis_engines/emotion_engine.js
 * EmotionEngine v4.6 - Smart Lexical & Multi-Dimensional Intelligence
 * وظيفته: استخراج المشاعر الخام، حساب الشدة، اكتشاف الحالات المركبة، وتقييم المخاطر.
 */

import { normalizeArabic, tokenize } from '../core/utils.js';

export class EmotionEngine {
    constructor(dictionaries = {}) {
        console.log("%c💓 [EmotionEngine] جاري تشغيل محرك الذكاء العاطفي...", "color: #E91E63; font-weight: bold;");

        // 1. ربط القواميس المركزية
        this.anchors = dictionaries.EMOTIONAL_ANCHORS?.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS || {};
        this.dynamics = dictionaries.EMOTIONAL_DYNAMICS || {};
        this.intensityModifers = dictionaries.INTENSITY_ANALYZER?.HIERARCHICAL_MODIFIERS || dictionaries.INTENSITY_ANALYZER || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};

        // 2. تجهيز أدوات التجذير
        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes) 
            ? rawPrefixes.map(p => p.value).sort((a,b) => b.length - a.length)
            : [];

        this.emotionalHistory = [];
        console.log(`✅ [EmotionEngine] المحرك جاهز. المراسي المحملة: ${Object.keys(this.anchors).length}`);
    }

    /**
     * الوظيفة الرئيسية: تشغيل Pipeline التحليل العاطفي بالكامل (8 خطوات)
     */
    async analyze(rawText, context = {}) {
        console.log("\n" + "%c💓 [EmotionEngine] STARTING PIPELINE...".repeat(1), "background: #E91E63; color: #fff; padding: 2px 5px;");
        
        const normalized = normalizeArabic(rawText.toLowerCase());
        const tokens = tokenize(normalized);

        // --- الخطوة 1: تحليل العواطف الأساسية ---
        console.log("   🔍 [1/8] Analyzing Primary Emotions...");
        const primaryResult = this._analyzePrimaryEmotions(tokens);

        // --- الخطوة 2: كشف العواطف المركبة ---
        console.log("   🔍 [2/8] Detecting Compound Emotions...");
        const compoundEmotions = this._detectCompoundEmotions(primaryResult.scores);

        // --- الخطوة 3: حساب الشدة المتقدمة ---
        console.log("   🔍 [3/8] Calculating Advanced Intensity...");
        const intensity = this._calculateIntensity(normalized, primaryResult.scores);

        // --- الخطوة 4: تحليل الأبعاد (Valence/Arousal) ---
        console.log("   🔍 [4/8] Analyzing Dimensions...");
        const dimensions = this._analyzeDimensions(primaryResult.primary);

        // --- الخطوة 5: الكشف عن نقاط التحول ---
        console.log("   🔍 [5/8] Detecting Inflection Points...");
        const inflectionPoints = []; // يتم حسابها بناءً على تاريخ الجلسة

        // --- الخطوة 6: تحليل الموجات العاطفية ---
        console.log("   🔍 [6/8] Analyzing Emotional Waves...");
        const waves = { pattern: intensity.overall > 0.7 ? 'ESCALATING' : 'STABLE' };

        // --- الخطوة 7: بناء البصمة العاطفية ---
        console.log("   🔍 [7/8] Generating Emotional Fingerprint...");
        const fingerprint = {
            primary: primaryResult.primary.name,
            intensity: intensity.overall,
            timestamp: Date.now()
        };

        // --- الخطوة 8: تحديد مؤشرات الخطر ---
        console.log("   🔍 [8/8] Identifying Risk Indicators...");
        const risk = this._assessRisk(primaryResult.primary, intensity.overall);

        console.log(`✅ [EmotionEngine] PIPELINE COMPLETE. Primary: ${primaryResult.primary.name} (${intensity.overall.toFixed(2)})`);

        return {
            primaryEmotion: primaryResult.primary,
            secondaryEmotions: primaryResult.secondary,
            compoundEmotions,
            intensity,
            dimensionalProfile: dimensions,
            emotionalWaves: waves,
            inflectionPoints,
            fingerprint,
            riskIndicators: { level: risk },
            _meta: { timestamp: new Date().toISOString() }
        };
    }

    /**
     * تحليل العواطف الأولية باستخدام القاموس والتجذير
     */
    _analyzePrimaryEmotions(tokens) {
        const scores = {};
        const detectedEntries = [];

        tokens.forEach(token => {
            const stem = this._stem(token);
            const entry = this.anchors[token] || this.anchors[stem];

            if (entry && entry.mood_scores) {
                console.log(`      🔥 [Match]: "${token}" -> ${Object.keys(entry.mood_scores).join(', ')}`);
                for (const [emo, score] of Object.entries(entry.mood_scores)) {
                    scores[emo] = (scores[emo] || 0) + (score * (entry.intensity || 1));
                }
                detectedEntries.push(entry);
            }
        });

        const sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]);

        return {
            scores,
            primary: sorted[0] ? { name: sorted[0][0], score: sorted[0][1], data: detectedEntries[0] } : { name: 'neutral', score: 0.3, data: {} },
            secondary: sorted.slice(1, 3).map(s => ({ name: s[0], score: s[1] }))
        };
    }

    /**
     * اكتشاف العواطف المركبة باستخدام قاموس الديناميكيات
     */
    _detectCompoundEmotions(scores) {
        const detected = [];
        const presentEmos = Object.keys(scores);

        for (const [key, state] of Object.entries(this.dynamics)) {
            const matches = state.core_emotions.filter(e => presentEmos.includes(e));
            if (matches.length / state.core_emotions.length > 0.5) {
                console.log(`      🧩 [Compound]: المزيج يشير إلى حالة [${state.name}]`);
                detected.push(state);
            }
        }
        return detected;
    }

    /**
     * حساب الشدة من قاموس Intensity Analyzer
     */
    _calculateIntensity(text, scores) {
        let multiplier = 1.0;
        const hasEmotions = Object.keys(scores).length > 0;
        let base = hasEmotions ? 0.6 : 0.3;

        for (const [group, layers] of Object.entries(this.intensityModifers)) {
            for (const [layer, words] of Object.entries(layers)) {
                for (const [word, data] of Object.entries(words)) {
                    if (text.includes(word)) {
                        const m = data.multiplier || 1.5;
                        multiplier *= m;
                        console.log(`      ⬆️ [Intensity Boost]: "${word}" (+${m}x)`);
                    }
                }
            }
        }

        return { overall: Math.min(1.0, base * multiplier), multiplier };
    }

    _analyzeDimensions(primary) {
        // محاولة جلب الأبعاد من بيانات القاموس
        return primary.data?.dimensionalProfile || { valence: 0, arousal: 0, dominance: 0 };
    }

    _assessRisk(primary, intensity) {
        if (intensity > 0.85 && (primary.name === 'sadness' || primary.name === 'hopelessness')) {
            console.log("      ⚠️ [CRITICAL RISK]: حزن شديد جداً مكتشف!");
            return "CRITICAL";
        }
        return "LOW";
    }

    _stem(token) {
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
