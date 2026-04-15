
/**
 * /analysis_engines/semantic_engine.js
 * SemanticEngine v6.1 - Context-Aware Workspace Enrichment Engine
 * التحديث: تعزيز stability + منع neutral collapse + تقوية semantic bias + تحسين التجميع
 */

import { normalizeArabic, tokenize } from '../core/utils.js';

export class SemanticEngine {
    constructor(dictionaries = {}) {
        console.log("%c🧠 [SemanticEngine v6.1] Stable Context-Aware Engine...", "color: #673AB7; font-weight: bold;");

        this.conceptMap = dictionaries.CONCEPT_MAP || {};
        this.conceptDefs = dictionaries.CONCEPT_DEFINITIONS || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};

        this.CLINICAL_WEIGHTS = {
            depression_symptom: 2.2,
            helplessness: 2.0,
            self_blame: 1.8,
            anxiety: 1.6,
            sadness: 1.2,
            general_distress: 0.8,
            neutral: 0.5
        };

        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes)
            ? rawPrefixes.map(p => p.value).sort((a, b) => b.length - a.length)
            : [];

        console.log("✅ [SemanticEngine] Ready (v6.1 Stable Mode)");
    }

    // =========================================================
    async analyze(workspace, context = {}) {
        console.log("\n%c[Semantic Reasoning v6.1] ENRICHMENT STARTED...", "background:#673AB7;color:#fff;");

        if (!workspace?.rawText) {
            console.error("❌ Missing workspace or rawText");
            return;
        }

        try {
            const rawText = workspace.rawText;
            const normalized = normalizeArabic(rawText.toLowerCase());
            const rawTokens = tokenize(normalized);

            // 🔥 1. Token enrichment
            const tokens = this._enrichTokens(rawTokens);

            // 🔥 2. Attention context
            const attentionMap = this._buildContextAwareAttention(
                tokens,
                workspace.attentionMap || {}
            );

            console.log(`   🔸 Tokens: ${tokens.length} | Attention enriched`);

            // 🔥 3. Concepts
            const weightedConcepts = this._extractHyperWeightedConcepts(tokens, attentionMap);

            // 🔥 4. Network
            const network = this._buildNetwork(weightedConcepts);

            // 🔥 5. Dominant
            const dominant = this._identifyDominantWeightedTheme(weightedConcepts);

            // 🔥 6. Uncertainty
            const uncertainty = this._calculateUncertainty(tokens, weightedConcepts);

            // =====================================================
            // 🔥 CRITICAL FIX: prevent neutral collapse upstream
            // =====================================================
            const safeDominant = dominant?.id && dominant.totalWeight > 0
                ? dominant
                : { id: "general_distress", totalWeight: 0.1, confidence: 0.1 };

            workspace.semantic = {
                concepts: weightedConcepts,
                network,
                dominantTheme: safeDominant.id,
                clinicalFocus: safeDominant,
                attentionDistribution: attentionMap,
                uncertainty,
                _meta: {
                    version: "6.1-Stable-Biased",
                    timestamp: new Date().toISOString()
                }
            };

            workspace.state.dominantConcept = safeDominant.id;
            workspace.state.semanticImpact = safeDominant.totalWeight;
            workspace.state.semanticUncertainty = uncertainty.score;

            console.log(
                `   ✅ [Complete] Focus: ${safeDominant.id} | Impact: ${safeDominant.totalWeight.toFixed(2)} | Uncertainty: ${uncertainty.score.toFixed(2)}`
            );

        } catch (err) {
            console.error("❌ SemanticEngine Error:", err);
        }
    }

    // =========================================================
    _enrichTokens(tokens) {
        return tokens.map((t, i) => ({
            raw: t,
            index: i,
            lower: t.toLowerCase(),
            window: {
                prev: tokens[i - 1] || null,
                next: tokens[i + 1] || null
            },
            isBoundary: i === 0 || i === tokens.length - 1
        }));
    }

    // =========================================================
    _buildContextAwareAttention(tokens, attentionMap) {
        const map = {};

        tokens.forEach(t => {
            let score = attentionMap[t.raw] || 0.5;

            if (t.window.prev)
                score += (attentionMap[t.window.prev] || 0) * 0.3;

            if (t.window.next)
                score += (attentionMap[t.window.next] || 0) * 0.3;

            if (t.isBoundary)
                score *= 1.1;

            map[t.raw] = Math.min(2, score);
        });

        return map;
    }

    // =========================================================
    _extractHyperWeightedConcepts(tokens, attentionMap) {
        const found = {};

        const ngrams = [];
        tokens.forEach(t => ngrams.push([t.raw]));

        for (let i = 0; i < tokens.length - 1; i++) {
            ngrams.push([tokens[i].raw, tokens[i + 1].raw]);
        }

        ngrams.forEach(ngram => {
            const phrase = ngram.join(' ');
            const stem = this._stemWord(phrase);

            const matches =
                this.conceptMap[phrase] ||
                this.conceptMap[stem];

            if (!matches) return;

            let attentionFactor =
                ngram.reduce((sum, w) => sum + (attentionMap[w] || 0.5), 0) /
                ngram.length;

            const attentionBoost = 1 + attentionFactor * 2;

            matches.forEach(m => {
                const id = m.concept;

                const clinicalBase =
                    this.CLINICAL_WEIGHTS[id] ||
                    this.CLINICAL_WEIGHTS.neutral;

                const finalImpact =
                    m.weight * clinicalBase * attentionBoost;

                if (!found[id]) {
                    found[id] = {
                        id,
                        impact: finalImpact,
                        baseWeight: m.weight,
                        attentionScore: attentionFactor,
                        definition: this.conceptDefs[id] || {},
                        occurrenceCount: 1
                    };
                } else {
                    found[id].impact += finalImpact;
                    found[id].occurrenceCount++;
                }
            });
        });

        return found;
    }

    // =========================================================
    _identifyDominantWeightedTheme(concepts) {
        const sorted = Object.entries(concepts)
            .sort((a, b) => b[1].impact - a[1].impact);

        if (!sorted.length) {
            return { id: "general_distress", totalWeight: 0.1, confidence: 0.1 };
        }

        return {
            id: sorted[0][0],
            totalWeight: sorted[0][1].impact,
            confidence: Math.min(1, sorted[0][1].impact / 5)
        };
    }

    // =========================================================
    _buildNetwork(foundConcepts) {
        const connections = [];
        const ids = Object.keys(foundConcepts);

        ids.forEach(id => {
            const def = foundConcepts[id].definition;

            if (!def?.links) return;

            def.links.forEach(link => {
                if (ids.includes(link.concept)) {
                    connections.push({
                        from: id,
                        to: link.concept,
                        type: link.type
                    });
                }
            });
        });

        return connections;
    }

    // =========================================================
    _stemWord(word) {
        let result = word;

        for (const p of this.prefixes) {
            if (result.startsWith(p) && result.length > p.length + 2) {
                const temp = result.substring(p.length);
                if (this.conceptMap[temp]) return temp;
            }
        }

        return result;
    }

    // =========================================================
    _calculateUncertainty(tokens, concepts) {
        const known = Object.keys(concepts).length;
        const total = tokens.length;

        const ratio = total ? (1 - known / total) : 1;

        return {
            score: ratio,
            level:
                ratio > 0.7 ? "HIGH" :
                ratio > 0.4 ? "MEDIUM" : "LOW"
        };
    }
}

export default SemanticEngine;
