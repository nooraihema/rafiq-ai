
/**
 * 🧠 core/transcendent_analyst.js - [THE NEURAL MASTERBRAIN]
 * المحلل الوجداني الفائق: محرك التحليل المركزي الذي يغذي محرك الردود.
 */

import { RAFIQ_SOUL_CONCEPTS } from '../rafiq_soul/dictionary.js'; 
import { LINGUISTIC_BASE } from './linguistic_base.js'; 
import { AFFECTIVE_FALLBACK } from './affective_fallback.js'; 

export class TranscendentAnalyst {
    constructor() {
        this.concepts = Object.values(RAFIQ_SOUL_CONCEPTS);
        this.contextBuffer = []; // ذاكرة لآخر 5 تفاعلات
    }

    /**
     * الوظيفة الكبرى: تحليل النص وتحويله إلى "وصفة رد"
     */
    analyze(rawText) {
        const startTimestamp = Date.now();

        // 1. التشريح والنبض الأولي
        const tokens = this._tokenize(rawText);
        const signals = this._extractSignals(tokens);
        const trend = this._analyzeTrend();

        // 2. كشف المفاهيم وتفعيل الرنين العصبي
        const activeFindings = this._detectActiveConcepts(tokens, signals);

        // 3. معالجة المنطقة الصفرية (في حال عدم وجود مفهوم)
        const fallbackPulse = (activeFindings.length === 0) ? this._getRawPulse(tokens) : null;

        // 4. رسم الإحداثيات وكشف التناقض
        const vadVector = this._calculateVAD(activeFindings, fallbackPulse);
        const hasDissonance = this._checkDissonance(rawText, vadVector);

        // 5. صياغة المخطط النهائي للرد (Blueprint)
        const blueprint = this._forgeResponseBlueprint(
            activeFindings,
            signals,
            vadVector,
            fallbackPulse,
            hasDissonance,
            trend
        );

        // 6. تحديث الذاكرة والتقرير النهائي
        this._updateBuffer(blueprint);
        this._printAdvancedLog(rawText, blueprint, Date.now() - startTimestamp);

        return blueprint;
    }

    _tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s\u0600-\u06FF]/g, "") // تنظيف الرموز مع الحفاظ على العربي
            .split(/\s+/).filter(t => t.length > 0);
    }

    _extractSignals(tokens) {
        let sigs = { intensity: 1.0, time: 'present', negated: false, focus: 'self' };
        tokens.forEach(t => {
            if (LINGUISTIC_BASE.negators.includes(t)) sigs.negated = true;
            if (LINGUISTIC_BASE.intensifiers.includes(t)) sigs.intensity *= 1.4;
            if (LINGUISTIC_BASE.temporal_past.includes(t)) sigs.time = 'past';
            if (LINGUISTIC_BASE.temporal_future.includes(t)) sigs.time = 'future';
        });
        return sigs;
    }

    _detectActiveConcepts(tokens, signals) {
        let matches = [];
        this.concepts.forEach(concept => {
            let score = 0;
            let detectedSeeds = [];
            const seeds = concept.linguistic_generator.auto_multipliers.state_seeds;
            const roots = concept.linguistic_generator.roots;

            tokens.forEach(t => {
                if (seeds.includes(t)) {
                    score += concept.activation_model.scoring.direct_match;
                    detectedSeeds.push(t);
                } else if (roots.some(r => t.includes(r))) {
                    score += concept.activation_model.scoring.pattern_match;
                    detectedSeeds.push(t);
                }
            });

            if (score >= concept.activation_model.threshold) {
                matches.push({
                    id: concept.id,
                    score: score * signals.intensity,
                    seeds: [...new Set(detectedSeeds)],
                    links: concept.neural_links.triggers_activation,
                    config: concept
                });
            }
        });

        // 🔥 الرنين العصبي (Neural Resonance): تفعيل العلاقات بين المفاهيم
        matches.forEach(m => {
            matches.forEach(other => {
                if (m.id !== other.id && m.links[other.id]) {
                    m.score += (other.score * m.links[other.id]);
                }
            });
        });

        return matches.sort((a, b) => b.score - a.score);
    }

    _getRawPulse(tokens) {
        let pulse = { v: 0, a: 0, count: 0 };
        tokens.forEach(t => {
            if (AFFECTIVE_FALLBACK[t]) {
                pulse.v += AFFECTIVE_FALLBACK[t].v;
                pulse.a += AFFECTIVE_FALLBACK[t].a;
                pulse.count++;
            }
        });
        return pulse.count > 0 ? { v: pulse.v / pulse.count, a: pulse.a / pulse.count } : { v: -0.1, a: -0.1 };
    }

    _calculateVAD(findings, fallback) {
        if (findings.length > 0) {
            let totalVAD = { v: 0, a: 0, d: 0 }, totalWeight = 0;
            findings.forEach(f => {
                const w = f.score;
                const v = f.config.cognitive_geometry.vad_coordinates;
                totalVAD.v += v.v * w; totalVAD.a += v.a * w; totalVAD.d += v.d * w;
                totalWeight += w;
            });
            return { v: totalVAD.v / totalWeight, a: totalVAD.a / totalWeight, d: totalVAD.d / totalWeight };
        }
        return { v: fallback.v, a: fallback.a, d: -0.5 };
    }

    _checkDissonance(text, vad) {
        const positiveWords = ["تمام", "كويس", "فل", "الحمد لله", "بخير"];
        return positiveWords.some(w => text.includes(w)) && vad.v < -0.45;
    }

    _analyzeTrend() {
        if (this.contextBuffer.length < 2) return "stable_new";
        const history = this.contextBuffer.slice(-3).map(b => b.meta.urgency);
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        if (last > prev + 0.2) return "escalating";
        if (last < prev - 0.2) return "improving";
        return "stable";
    }

    _forgeResponseBlueprint(findings, signals, vad, fallback, dissonance, trend) {
        const isZeroZone = findings.length === 0;
        const primary = !isZeroZone ? findings[0] : null;

        return {
            intent: this._decideIntent(isZeroZone, signals, trend),
            tone_blueprint: {
                warmth: Math.abs(vad.v) > 0.5 ? 'high' : 'medium',
                energy: vad.a < -0.3 ? 'calm_gentle' : 'active_attentive',
                style: dissonance ? 'careful_probing' : (isZeroZone ? 'exploratory' : 'direct_empathy')
            },
            payload: {
                primary_concept: primary ? primary.id : 'unknown',
                seeds: primary ? primary.seeds : (isZeroZone ? ['الموضوع ده'] : []),
                resonance: primary ? Object.keys(primary.links) : [],
                action: vad.v < -0.7 ? 'intensive_containment' : 'soft_validation'
            },
            meta: {
                is_zero_zone: isZeroZone,
                dissonance: dissonance,
                urgency: (Math.abs(vad.v) * signals.intensity).toFixed(2),
                trend: trend,
                confidence: primary ? Math.min(primary.score / 5, 1).toFixed(2) : 0.3
            }
        };
    }

    _decideIntent(isZero, sigs, trend) {
        if (isZero) return 'STRATEGIC_CURIOSITY';
        if (trend === "escalating") return 'CRISIS_STABILIZATION';
        if (sigs.intensity > 1.5) return 'DEEP_VALIDATION';
        return 'EMPATHETIC_REFRAMING';
    }

    _updateBuffer(bp) {
        this.contextBuffer.push(bp);
        if (this.contextBuffer.length > 5) this.contextBuffer.shift();
    }

    /**
     * 📊 نظام التقارير المتقدم لـ Console
     */
    _printAdvancedLog(text, bp, duration) {
        const color = bp.meta.dissonance ? "#FF9800" : (bp.meta.is_zero_zone ? "#9C27B0" : "#4CAF50");
        console.log(`%c----------- [ RAFIC ANALYTICS REPORT ] -----------`, `color: ${color}; font-weight: bold;`);
        console.log(`%c입력 (Input):%c "${text}"`, "color: #777;", "color: #eee; font-style: italic;");
        console.log(`%c🎯 Intent: %c${bp.intent}%c | 🌡️ Urgency: %c${bp.meta.urgency}`, "color: #777;", "color: #FFF; font-weight: bold;", "color: #777;", "color: #f44336;");
        console.log(`%c🧠 Concept: %c${bp.payload.primary_concept}%c | 📈 Trend: %c${bp.meta.trend}`, "color: #777;", "color: #2196F3;", "color: #777;", "color: #FFEB3B;");
        if (bp.meta.dissonance) console.log("%c⚠️ WARNING: Dissonance Detected (Possible Denial)", "background: #332200; color: #FF9800; padding: 2px;");
        console.log(`%c🛠️ Blueprint Generated in ${duration}ms`, "color: #777; font-size: 10px;");
        console.log(`%c--------------------------------------------------`, `color: ${color};`);
    }
}
