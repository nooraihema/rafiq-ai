
/**
 * /analysis_engines/emotion_engine.js
 * EmotionEngine v4.8 - Ultra-Robust Edition
 */

import { normalizeArabic, tokenize } from '../core/utils.js';

export class EmotionEngine {
    constructor(dictionaries = {}) {
        console.log("%c💓 [EmotionEngine] جاري تشغيل المحرك المطور (V4.8)...", "color: #E91E63; font-weight: bold;");

        // تأمين الوصول للقواميس
        this.anchors = dictionaries.EMOTIONAL_ANCHORS?.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS || {};
        this.intensityModifers = dictionaries.INTENSITY_ANALYZER?.HIERARCHICAL_MODIFIERS || dictionaries.INTENSITY_ANALYZER || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};

        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes) ? rawPrefixes.map(p => p.value).sort((a,b) => b.length - a.length) : [];
        
        console.log(`✅ [EmotionEngine] تم تحميل ${Object.keys(this.anchors).length} مرساة عاطفية.`);
    }

    async analyze(rawText, context = {}) {
        console.log("\n" + "%c💓 [EmotionEngine] STARTING ANALYSIS".repeat(1), "background: #E91E63; color: #fff; padding: 2px 5px;");
        
        try {
            const normalized = normalizeArabic(rawText.toLowerCase());
            const tokens = tokenize(normalized);

            // 1. استخراج العواطف (بأمان تام)
            const detectedEmotions = this._extractEmotions(tokens);

            // 2. حساب الشدة (بحماية من تداخل الكلمات)
            const intensity = this._calculateIntensity(tokens, normalized, detectedEmotions);

            // 3. تحديد العاطفة السائدة
            const primary = this._identifyPrimary(detectedEmotions);

            // 4. تقييم المخاطر
            const risk = this._assessRisk(primary, intensity.overall);

            console.log(`   ✅ [EmotionEngine Complete] Primary: ${primary.name} | Intensity: ${intensity.overall.toFixed(2)}`);

            return {
                primaryEmotion: primary,
                intensity: intensity,
                detectedEmotions,
                riskIndicators: { level: risk },
                _meta: { timestamp: new Date().toISOString() }
            };
        } catch (err) {
            console.error("❌ [EmotionEngine] Error in analysis:", err);
            return {
                primaryEmotion: { name: 'neutral', score: 0.3 },
                intensity: { overall: 0.3 },
                detectedEmotions: {},
                riskIndicators: { level: "LOW" }
            };
        }
    }

    /**
     * استخراج العواطف مع حماية من أخطاء المصفوفات
     */
    _extractEmotions(tokens) {
        console.log("   🔍 [1/8] Extracting Emotions...");
        const scores = {};
        
        // توليد N-grams داخلياً لضمان عدم الاعتماد على دوال قد تفشل
        const ngrams = [];
        // كلمات مفردة
        tokens.forEach(t => ngrams.push(t));
        // كلمات ثنائية (Bigrams)
        for (let i = 0; i < tokens.length - 1; i++) {
            ngrams.push(`${tokens[i]} ${tokens[i+1]}`);
        }

        ngrams.forEach(phrase => {
            const stem = this._stem(phrase);
            const entry = this.anchors[phrase] || this.anchors[stem];

            if (entry && entry.mood_scores) {
                console.log(`      🔥 [Match Found]: "${phrase}"`);
                for (const [emo, score] of Object.entries(entry.mood_scores)) {
                    scores[emo] = (scores[emo] || 0) + (score * (entry.intensity || 1));
                }
            }
        });

        return scores;
    }

    /**
     * حساب الشدة مع حماية "كلمات الحشو" (مثل لا)
     */
    _calculateIntensity(tokens, fullText, scores) {
        console.log("   🔍 [3/8] Calculating Intensity...");
        let multiplier = 1.0;
        const hasEmotions = Object.keys(scores).length > 0;
        let base = hasEmotions ? 0.7 : 0.4;

        if (!this.intensityModifers) return { overall: base, multiplier: 1.0 };

        for (const [group, layers] of Object.entries(this.intensityModifers)) {
            if (typeof layers !== 'object') continue;
            
            for (const [layer, words] of Object.entries(layers)) {
                for (const [word, data] of Object.entries(words)) {
                    const cleanWord = normalizeArabic(word);
                    
                    // القاعدة الذهبية: الكلمات القصيرة (لا، مش، بس) يجب أن تكون كلمة كاملة
                    const isPresent = (cleanWord.length > 2) 
                        ? fullText.includes(cleanWord) 
                        : tokens.includes(cleanWord);

                    if (isPresent) {
                        const m = data.multiplier || 1.0;
                        multiplier *= m;
                        console.log(`      ⬆️ [Mod]: "${cleanWord}" (${m}x)`);
                    }
                }
            }
        }

        const final = Math.min(1.0, base * multiplier);
        return { overall: final, multiplier };
    }

    _identifyPrimary(scores) {
        const sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]);
        if (sorted.length === 0) return { name: 'neutral', score: 0.3 };
        return { name: sorted[0][0], score: sorted[0][1] };
    }

    _assessRisk(primary, intensity) {
        if (intensity > 0.8 && (primary.name === 'sadness' || primary.name === 'hopelessness')) return "HIGH";
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
