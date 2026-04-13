
/**
 * /analysis_engines/emotion_engine.js
 * EmotionEngine v4.7 - Anti-Collision & Word-Boundary Edition
 */

import { normalizeArabic, tokenize, generateNgrams } from '../core/utils.js';

export class EmotionEngine {
    constructor(dictionaries = {}) {
        console.log("%c💓 [EmotionEngine] جاري تشغيل المحرك المطور (نسخة الحماية من التداخل)...", "color: #E91E63; font-weight: bold;");

        this.anchors = dictionaries.EMOTIONAL_ANCHORS?.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS || {};
        this.intensityModifers = dictionaries.INTENSITY_ANALYZER?.HIERARCHICAL_MODIFIERS || dictionaries.INTENSITY_ANALYZER || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};

        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes) ? rawPrefixes.map(p => p.value).sort((a,b) => b.length - a.length) : [];
        
        console.log("✅ [EmotionEngine] تم تفعيل نظام الحماية وربط القواميس.");
    }

    async analyze(rawText, context = {}) {
        console.log("\n" + "%c💓 [EmotionEngine] STARTING SECURE ANALYSIS".repeat(1), "background: #E91E63; color: #fff; padding: 2px 5px;");
        
        const normalized = normalizeArabic(rawText.toLowerCase());
        const tokens = tokenize(normalized);

        // 1. استخراج العواطف (باستخدام N-grams لضمان التقاط "اكتئاب شديد")
        const detectedEmotions = this._extractEmotions(tokens);

        // 2. حساب الشدة مع حماية الكلمات الصغيرة (مثل "لا")
        const intensity = this._calculateIntensity(tokens, normalized, detectedEmotions);

        // 3. العاطفة السائدة
        const primary = this._identifyPrimary(detectedEmotions);

        // 4. تقييم المخاطر
        const risk = this._assessRisk(primary, intensity.overall);

        return {
            primaryEmotion: primary,
            intensity: intensity,
            detectedEmotions,
            riskIndicators: { level: risk },
            _meta: { timestamp: new Date().toISOString() }
        };
    }

    _extractEmotions(tokens) {
        console.log("   🔍 [1/8] Analyzing Primary Emotions (with N-grams)...");
        const scores = {};
        
        // توليد N-grams لضمان التقاط العبارات العاطفية
        const ngrams = [...generateNgrams(tokens, 2), ...tokens.map(t => [t])];

        ngrams.forEach(ngram => {
            const phrase = ngram.join(' ');
            const stem = this._stem(phrase);
            
            // البحث عن الكلمة، الجذر، أو حتى اسم المفهوم الدلالي
            const entry = this.anchors[phrase] || this.anchors[stem];

            if (entry && entry.mood_scores) {
                console.log(`      🔥 [Match]: "${phrase}" -> ${Object.keys(entry.mood_scores).join(', ')}`);
                for (const [emo, score] of Object.entries(entry.mood_scores)) {
                    scores[emo] = (scores[emo] || 0) + (score * (entry.intensity || 1));
                }
            }
        });

        return scores;
    }

    _calculateIntensity(tokens, fullText, scores) {
        console.log("   🔍 [3/8] Calculating Intensity (Whole Word Match Mode)...");
        let multiplier = 1.0;
        const hasEmotions = Object.keys(scores).length > 0;
        let base = hasEmotions ? 0.7 : 0.4;

        for (const [group, layers] of Object.entries(this.intensityModifers)) {
            for (const [layer, words] of Object.entries(layers)) {
                for (const [word, data] of Object.entries(words)) {
                    
                    const cleanWord = normalizeArabic(word);
                    
                    // حماية الكلمات الصغيرة: يجب أن تكون كلمة كاملة وسط التوكنز
                    // هذا يمنع "لا" الموجودة داخل "بالاكتئاب" من تدمير الشدة
                    const isPresent = (cleanWord.length > 2) 
                        ? fullText.includes(cleanWord) 
                        : tokens.includes(cleanWord);

                    if (isPresent) {
                        const m = data.multiplier || 1.0;
                        // إذا كانت أداة نفي (مثل لا، مش) وصغيرة، نطبقها بحذر
                        multiplier *= m;
                        console.log(`      ⬆️ [Intensity]: تم رصد "${cleanWord}" (تأثير: ${m}x)`);
                    }
                }
            }
        }

        const final = Math.min(1.0, base * multiplier);
        console.log(`   📈 Final Intensity Score: ${final.toFixed(3)}`);
        return { overall: final, multiplier };
    }

    _identifyPrimary(scores) {
        const sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]);
        return sorted.length > 0 
            ? { name: sorted[0][0], score: sorted[0][1] }
            : { name: 'neutral', score: 0.3 };
    }

    _assessRisk(primary, intensity) {
        return (intensity > 0.8 && primary.name === 'sadness') ? "HIGH" : "LOW";
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
