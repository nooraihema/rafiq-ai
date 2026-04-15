
/**
 * EmotionEngine v6.1 - Cognitive Field Integration (Stability Fix Edition)
 * تحسين: منع neutral collapse + تقوية semantic bias + تحسين التجميع
 */

import { normalizeArabic, tokenize } from '../core/utils.js';

export class EmotionEngine {
    constructor(dictionaries = {}) {
        console.log("%c💓 [EmotionEngine v6.1] Stable Cognitive Modeling Engine...", "color: #E91E63; font-weight: bold;");

        this.anchors = dictionaries.EMOTIONAL_ANCHORS?.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS || {};
        this.intensityModifers = dictionaries.INTENSITY_ANALYZER?.HIERARCHICAL_MODIFIERS || dictionaries.INTENSITY_ANALYZER || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};

        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes)
            ? rawPrefixes.map(p => p.value).sort((a,b) => b.length - a.length)
            : [];

        this.VAD_MAP = {
            sadness:     { v: -0.6, a: -0.2, d: -0.4 },
            depression:  { v: -0.95, a: -0.75, d: -0.95 },
            anxiety:     { v: -0.7, a: 0.8,  d: -0.6 },
            anger:       { v: -0.5, a: 0.9,  d: 0.7  },
            joy:         { v: 0.8,  a: 0.6,  d: 0.6  },
            hopelessness:{ v: -0.9, a: -0.5, d: -0.8 },
            neutral:     { v: 0.0,  a: 0.0,  d: 0.0  }
        };
    }

    async analyze(workspace, context = {}) {
        if (!workspace || !workspace.rawText) return;

        try {
            const rawText = workspace.rawText;
            const normalized = normalizeArabic(rawText.toLowerCase());
            const tokens = tokenize(normalized);

            const attentionMap = workspace.attentionMap || {};

            const semanticBias = this._calculateSemanticBias(workspace);

            const emotionalData = this._extractWeightedEmotions(
                tokens,
                attentionMap,
                semanticBias,
                normalized
            );

            const detectedEmotionsMap = {};
            emotionalData.forEach(i => i.key && (detectedEmotionsMap[i.key] = true));

            const stateModel = this._calculateWeightedStateModel(emotionalData);

            const refinedModel = this._applyIntensityToModel(normalized, tokens, stateModel);

            const fingerprint = this._generateFingerprint(refinedModel, semanticBias);

            workspace.emotion = {
                stateModel: refinedModel,
                primaryEmotion: { name: fingerprint.label, score: fingerprint.intensity },
                intensity: { overall: fingerprint.intensity },
                detectedEmotions: detectedEmotionsMap,
                attentionContribution: attentionMap,
                riskIndicators: { level: this._assessRisk(refinedModel) },
                _meta: { timestamp: new Date().toISOString(), version: "6.1" }
            };

            workspace.state.globalMood = fingerprint.label;
            workspace.state.energyLevel = refinedModel.a;

        } catch (err) {
            console.error(err);
        }
    }

    /**
     * 🔥 FIX 1: تقوية semantic bias بدل ما يكون ضعيف
     */
    _calculateSemanticBias(workspace) {
        const dominant = workspace.state.dominantConcept || "neutral";
        const impact = workspace.state.semanticImpact || 0;

        const strongTargets = [
            "depression_symptom",
            "helplessness",
            "sadness",
            "self_blame",
            "fatigue",
            "anhedonia"
        ];

        if (strongTargets.includes(dominant)) {
            return {
                type: "NEGATIVE_CLINICAL",
                force: Math.min(1.0, impact * 0.9) // 🔥 رفع القوة
            };
        }

        return { type: "NEUTRAL", force: 0 };
    }

    /**
     * 🔥 FIX 2: منع reset للـ VAD (مهم جدًا)
     */
    _extractWeightedEmotions(tokens, attentionMap, semanticBias, text) {
        const matches = [];

        const ngrams = [...tokens];
        for (let i = 0; i < tokens.length - 1; i++) {
            ngrams.push(`${tokens[i]} ${tokens[i+1]}`);
        }

        let foundAny = false;

        ngrams.forEach(phrase => {
            const entry = this.anchors[phrase];

            if (entry && entry.mood_scores) {
                foundAny = true;

                const primaryKey = Object.keys(entry.mood_scores)[0];
                let vadBase = { ...(this.VAD_MAP[primaryKey] || this.VAD_MAP.neutral) };

                // 🔥 BOOST semantic bias effect
                if (semanticBias.type === "NEGATIVE_CLINICAL") {
                    vadBase.v -= semanticBias.force;
                    vadBase.a -= semanticBias.force * 0.5;
                }

                const words = phrase.split(' ');
                const attentionFactor =
                    words.reduce((s, w) => s + (attentionMap[w] || 0.5), 0) / words.length;

                const finalWeight = (entry.intensity || 1) * (1 + attentionFactor * 2);

                matches.push({
                    key: primaryKey,
                    vad: vadBase,
                    weight: finalWeight
                });
            }
        });

        /**
         * 🔥 FIX 3: fallback emotional injection بدل neutral
         */
        if (!foundAny) {
            if (text.includes("حزين") || text.includes("تعب") || text.includes("خنقة")) {
                matches.push({
                    key: "sadness",
                    vad: this.VAD_MAP.sadness,
                    weight: 1.2
                });
            }
        }

        return matches;
    }

    _calculateWeightedStateModel(data) {
        if (!data.length) return { v: -0.2, a: -0.1, d: -0.3 }; // 🔥 بدل neutral

        let v = 0, a = 0, d = 0, w = 0;

        data.forEach(i => {
            v += i.vad.v * i.weight;
            a += i.vad.a * i.weight;
            d += i.vad.d * i.weight;
            w += i.weight;
        });

        return { v: v / w, a: a / w, d: d / w };
    }

    _applyIntensityToModel(text, tokens, model) {
        let multiplier = 1.0;

        for (const group of Object.values(this.intensityModifers || {})) {
            if (typeof group !== 'object') continue;

            for (const words of Object.values(group)) {
                for (const word of Object.keys(words)) {
                    if (text.includes(normalizeArabic(word))) {
                        multiplier *= words[word].multiplier || 1.1;
                    }
                }
            }
        }

        return {
            v: Math.max(-1, Math.min(1, model.v * multiplier)),
            a: Math.max(-1, Math.min(1, model.a * multiplier)),
            d: Math.max(-1, Math.min(1, model.d * (1 / multiplier))),
            multiplier
        };
    }

    /**
     * 🔥 FIX 4: lower threshold + sensitivity boost
     */
    _generateFingerprint(model, bias) {
        const { v, a, d } = model;

        let label = "neutral";

        if (v < -0.2) {
            if (a < -0.2) label = "lethargic_depression";
            else label = "sadness";
        }

        if (bias?.type === "NEGATIVE_CLINICAL" && v < -0.1) {
            label = "clinical_depression";
        }

        const intensity = Math.min(1, (Math.abs(v) + Math.abs(a) + Math.abs(d)) / 2.5);

        return { label, intensity };
    }

    _assessRisk(m) {
        if (m.v < -0.8 && m.a < -0.5) return "CRITICAL";
        return "LOW";
    }

    _stem(token) {
        return token;
    }
}

export default EmotionEngine;
