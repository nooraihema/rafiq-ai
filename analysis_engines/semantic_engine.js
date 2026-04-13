
/**
 * /analysis_engines/semantic_engine.js
 * SemanticEngine v4.6 - Robust Lexical Analyzer
 */

import { normalizeArabic, tokenize, generateNgrams } from '../core/utils.js';

export class SemanticEngine {
    constructor(dictionaries = {}) {
        console.log("%c🧠 [SemanticEngine] جاري تشغيل المحرك الدلالي الذكي...", "color: #673AB7; font-weight: bold;");

        // ربط القواميس الممررة
        this.conceptMap = dictionaries.CONCEPT_MAP || {};
        this.conceptDefs = dictionaries.CONCEPT_DEFINITIONS || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};
        this.stopWords = dictionaries.STOP_WORDS_SET || new Set();
        
        // تأمين وتجهيز أدوات التجذير (Stemming)
        const rawPrefixes = this.affixes.prefixes || [];
        const rawSuffixes = this.affixes.suffixes || [];

        this.prefixes = Array.isArray(rawPrefixes) 
            ? rawPrefixes.map(p => p.value).sort((a,b) => b.length - a.length)
            : [];
        this.suffixes = Array.isArray(rawSuffixes)
            ? rawSuffixes.map(s => s.value).sort((a,b) => b.length - a.length)
            : [];

        console.log(`✅ [SemanticEngine] تم تجهيز المحرك. القواميس محملة: ${Object.keys(this.conceptMap).length > 0}`);
    }

    async analyze(rawText, context = {}) {
        console.log("\n" + "%c[Semantic Analysis] START".repeat(1), "background: #673AB7; color: #fff; padding: 2px 5px;");
        
        try {
            const normalized = normalizeArabic(rawText.toLowerCase());
            const tokens = tokenize(normalized);
            console.log(`   🔸 [Step 1: Tokens] الكلمات المستخرجة: [${tokens.join(', ')}]`);

            const concepts = this._extractConcepts(tokens, normalized);
            const network = this._buildNetwork(concepts);
            const hiddenGoals = this._inferHiddenGoals(concepts);

            console.log(`   ✅ [Analysis Complete] تم اكتشاف ${Object.keys(concepts).length} مفاهيم.`);
            
            return {
                concepts,
                network,
                hiddenGoals,
                dominantTheme: this._identifyDominantTheme(concepts),
                _meta: { engineVersion: "4.6-Robust" }
            };
        } catch (err) {
            console.error("❌ [SemanticEngine] Critical error during analysis:", err);
            return { concepts: {}, network: [], error: err.message };
        }
    }

    _extractConcepts(tokens, normalizedFullText) {
        console.log("   🔸 [Step 2: Extraction] جاري فحص الكلمات والـ N-grams...");
        const found = {};

        // 1. توليد الـ N-grams وتأمينها
        let ngrams = [];
        try {
            const grams3 = generateNgrams(tokens, 3) || [];
            const grams2 = generateNgrams(tokens, 2) || [];
            const grams1 = tokens.map(t => [t]);
            ngrams = [...grams3, ...grams2, ...grams1];
        } catch (e) {
            console.warn("⚠️ [SemanticEngine] فشل توليد N-grams، سيتم الاعتماد على الكلمات المفردة فقط.");
            ngrams = tokens.map(t => [t]);
        }

        // 2. البحث في القاموس
        ngrams.forEach(ngram => {
            try {
                // التأكد من أن ngram مصفوفة قبل عمل join
                const text = Array.isArray(ngram) ? ngram.join(' ') : ngram;
                const norm = normalizeArabic(text);

                // أ. محاولة المطابقة المباشرة
                let matches = this.conceptMap[norm];

                // ب. إذا لم يجد مطابقة وكانت كلمة واحدة، نحاول التجذير
                if (!matches && (!ngram[1])) {
                    const stemmed = this._stemWord(norm);
                    if (this.conceptMap[stemmed]) {
                        matches = this.conceptMap[stemmed];
                        console.log(`      ✨ [Stem Match]: "${norm}" -> "${stemmed}"`);
                    }
                }

                // ج. إضافة النتائج المكتشفة
                if (matches && Array.isArray(matches)) {
                    matches.forEach(m => {
                        const id = m.concept;
                        if (!found[id]) {
                            console.log(`      🎯 [Match Found]: [${id}] (وزن: ${m.weight})`);
                            found[id] = {
                                id,
                                weight: m.weight,
                                definition: this.conceptDefs[id] || {},
                                count: 1
                            };
                        } else {
                            found[id].count++;
                        }
                    });
                }
            } catch (wordError) {
                // استمرار العملية حتى لو فشلت كلمة واحدة
            }
        });

        return found;
    }

    _stemWord(word) {
        let result = word;
        // تجربة قص السوابق
        for (const p of this.prefixes) {
            if (result.startsWith(p) && result.length > p.length + 2) {
                let temp = result.substring(p.length);
                if (this.conceptMap[temp]) return temp;
            }
        }
        // تجربة قص اللواحق
        for (const s of this.suffixes) {
            if (result.endsWith(s) && result.length > s.length + 2) {
                let temp = result.substring(0, result.length - s.length);
                if (this.conceptMap[temp]) return temp;
            }
        }
        return result;
    }

    _buildNetwork(foundConcepts) {
        const connections = [];
        const ids = Object.keys(foundConcepts);
        ids.forEach(id => {
            const def = foundConcepts[id].definition;
            if (def && def.links) {
                def.links.forEach(link => {
                    if (ids.includes(link.concept)) {
                        connections.push({ from: id, to: link.concept, type: link.type });
                    }
                });
            }
        });
        return connections;
    }

    _inferHiddenGoals(concepts) {
        const goals = [];
        if (concepts['helplessness']) goals.push({ goal: "الرغبة في السيطرة", reason: "شعور بالعجز" });
        if (concepts['depression_symptom']) goals.push({ goal: "طلب المساندة", reason: "مزاج منخفض" });
        return goals;
    }

    _identifyDominantTheme(concepts) {
        const sorted = Object.entries(concepts).sort((a,b) => b[1].weight - a[1].weight);
        return sorted[0]?.[0] || "general";
    }
}

export default SemanticEngine;
