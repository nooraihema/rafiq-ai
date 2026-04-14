/**
 * /analysis_engines/semantic_engine.js
 * SemanticEngine v6.1 - Context-Aware Workspace Enrichment Engine
 * التحديث: إضافة Token Enrichment + Context Attention + Uncertainty Layer
 */

import { normalizeArabic, tokenize, generateNgrams } from '../core/utils.js';

export class SemanticEngine {
    constructor(dictionaries = {}) {
        console.log("%c🧠 [SemanticEngine v6.1] تهيئة المحرك الدلالي المتقدم...", "color: #673AB7; font-weight: bold;");

        // =========================
        // 📚 External Dictionaries
        // =========================
        this.conceptMap = dictionaries.CONCEPT_MAP || {};
        this.conceptDefs = dictionaries.CONCEPT_DEFINITIONS || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};

        // =========================
        // 🧠 Clinical Weights
        // =========================
        this.CLINICAL_WEIGHTS = {
            depression_symptom: 2.2,
            helplessness: 2.0,
            self_blame: 1.8,
            anxiety: 1.6,
            sadness: 1.2,
            general_distress: 0.8,
            neutral: 0.5
        };

        // =========================
        // Prefixes / Morphology
        // =========================
        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes)
            ? rawPrefixes.map(p => p.value).sort((a, b) => b.length - a.length)
            : [];

        console.log("✅ [SemanticEngine] Ready (v6.1 Workspace Mode)");
    }

    // =========================================================
    // 🚀 MAIN ENTRY POINT
    // =========================================================
    async analyze(workspace, context = {}) {
        console.log("\n" + "%c[Semantic Reasoning v6.1] ENRICHMENT STARTED...", "background:#673AB7;color:#fff;");

        if (!workspace?.rawText) {
            console.error("❌ Missing workspace or rawText");
            return;
        }

        try {
            // =========================
            // 1. Normalize & Tokenize
            // =========================
            const rawText = workspace.rawText;
            const normalized = normalizeArabic(rawText.toLowerCase());
            const rawTokens = tokenize(normalized);

            // =========================
            // 2. Token Enrichment Layer 🔥 NEW
            // =========================
            const tokens = this._enrichTokens(rawTokens);

            // =========================
            // 3. Context-Aware Attention 🔥 NEW
            // =========================
            const attentionMap = this._buildContextAwareAttention(
                tokens,
                workspace.attentionMap || {}
            );

            console.log(`   🔸 Tokens: ${tokens.length} | Attention enriched`);

            // =========================
            // 4. Concept Extraction
            // =========================
            const weightedConcepts = this._extractHyperWeightedConcepts(tokens, attentionMap);

            // =========================
            // 5. Semantic Network
            // =========================
            const network = this._buildNetwork(weightedConcepts);

            // =========================
            // 6. Dominant Theme
            // =========================
            const dominant = this._identifyDominantWeightedTheme(weightedConcepts);

            // =========================
            // 7. Uncertainty Layer 🔥 NEW
            // =========================
            const uncertainty = this._calculateUncertainty(tokens, weightedConcepts);

            // =========================
            // 8. Inject into Workspace
            // =========================
            workspace.semantic = {
                concepts: weightedConcepts,
                network,
                dominantTheme: dominant.id,
                clinicalFocus: dominant,
                attentionDistribution: attentionMap,
                uncertainty,
                _meta: {
                    version: "6.1-ContextAware",
                    timestamp: new Date().toISOString()
                }
            };

            // update global workspace state
            workspace.state.dominantConcept = dominant.id;
            workspace.state.semanticImpact = dominant.totalWeight;
            workspace.state.semanticUncertainty = uncertainty.score;

            console.log(
                `   ✅ [Complete] Focus: ${dominant.id} | Impact: ${dominant.totalWeight.toFixed(2)} | Uncertainty: ${uncertainty.score.toFixed(2)}`
            );

        } catch (err) {
            console.error("❌ SemanticEngine Error:", err);
        }
    }

    // =========================================================
    // 🔥 NEW: Token Enrichment Layer
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
    // 🔥 NEW: Context-Aware Attention
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
    // 🧠 CORE CONCEPT EXTRACTION
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
    // 📊 Dominant Theme
    // =========================================================
    _identifyDominantWeightedTheme(concepts) {
        const sorted = Object.entries(concepts)
            .sort((a, b) => b[1].impact - a[1].impact);

        if (!sorted.length) {
            return { id: "neutral", totalWeight: 0, confidence: 0 };
        }

        return {
            id: sorted[0][0],
            totalWeight: sorted[0][1].impact,
            confidence: Math.min(1, sorted[0][1].impact / 5)
        };
    }

    // =========================================================
    // 🌐 Semantic Network
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
    // 🧩 Morphological Stemmer
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
    // ⚠️ NEW: Uncertainty Engine
    // =========================================================
    _calculateUncertainty(tokens, concepts) {
        const known = Object.keys(concepts).length;
        const total = tokens.length;

        const ratio = 1 - known / total;

        return {
            score: ratio,
            level:
                ratio > 0.7 ? "HIGH" :
                ratio > 0.4 ? "MEDIUM" : "LOW"
        };
    }
}

export default SemanticEngine;
