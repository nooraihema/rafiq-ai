
/**
 * /analysis_engines/semantic_engine.js
 * SemanticEngine v5.5 - Attention-Driven Clinical Intelligence
 * التغيير الجوهري: دمج أوزان الانتباه (Salience) مع الأهمية السريرية (Clinical Weights).
 */

import { normalizeArabic, tokenize, generateNgrams } from '../core/utils.js';

export class SemanticEngine {
    constructor(dictionaries = {}) {
        console.log("%c🧠 [SemanticEngine v5.5] تهيئة المحرك الدلالي الموجه بالانتباه...", "color: #673AB7; font-weight: bold;");

        // 1. ربط القواميس
        this.conceptMap = dictionaries.CONCEPT_MAP || {};
        this.conceptDefs = dictionaries.CONCEPT_DEFINITIONS || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};
        
        // 2. أوزان الأهمية السريرية (Clinical Significance Weights)
        // تعطي ثقلاً أكبر للمصطلحات التي تشير لحالات حرجة
        this.CLINICAL_WEIGHTS = {
            "depression_symptom": 2.2,
            "helplessness": 2.0,
            "self_blame": 1.8,
            "anxiety": 1.6,
            "sadness": 1.2,
            "general_distress": 0.8,
            "neutral": 0.5
        };

        // 3. تجهيز أدوات التجذير
        const rawPrefixes = this.affixes.prefixes || [];
        this.prefixes = Array.isArray(rawPrefixes) ? rawPrefixes.map(p => p.value).sort((a,b) => b.length - a.length) : [];

        console.log("✅ [SemanticEngine] المحرك جاهز لاستقبال بيانات طبقة الانتباه.");
    }

    /**
     * الوظيفة الرئيسية: تحليل النص دلالياً مع حقن أوزان الانتباه
     */
    async analyze(rawText, context = {}) {
        console.log("\n" + "%c[Semantic Reasoning] STARTING...".repeat(1), "background: #673AB7; color: #fff; padding: 2px 5px;");
        
        try {
            const normalized = normalizeArabic(rawText.toLowerCase());
            const tokens = tokenize(normalized);
            
            // استرجاع خريطة الانتباه من السياق (Context) المرسل من LinguisticBrain
            const attentionMap = context.attentionMap || {};
            console.log(`   🔸 [Context Injected]: تم استقبال خريطة انتباه لـ ${Object.keys(attentionMap).length} كلمات.`);

            // 1. استخراج المفاهيم الموزونة (القاموس + الأهمية السريرية + الانتباه)
            const weightedConcepts = this._extractHyperWeightedConcepts(tokens, attentionMap);

            // 2. بناء شبكة العلاقات (Semantic Network)
            const network = this._buildNetwork(weightedConcepts);

            // 3. تحديد بؤرة التركيز السريري (Clinical Dominance)
            const dominant = this._identifyDominantWeightedTheme(weightedConcepts);

            console.log(`   ✅ [Semantic Complete] Focus: ${dominant.id} | Total Impact: ${dominant.totalWeight.toFixed(2)}`);

            return {
                concepts: weightedConcepts,
                network,
                dominantTheme: dominant.id,
                clinicalFocus: dominant,
                attentionDistribution: attentionMap,
                _meta: { version: "5.5-Attention-Driven", timestamp: new Date().toISOString() }
            };

        } catch (err) {
            console.error("❌ [SemanticEngine Error]:", err);
            return { concepts: {}, dominantTheme: "general" };
        }
    }

    /**
     * المعادلة السحرية: الوزن النهائي = (وزن القاموس) * (الثقل السريري) * (معامل الانتباه)
     */
    _extractHyperWeightedConcepts(tokens, attentionMap) {
        console.log("   🔍 [Step 2: Hyper-Weighting] جاري حساب الوزن الثلاثي لكل مفهوم...");
        const found = {};

        // فحص الكلمات الفردية والثنائية (N-grams)
        const ngrams = [];
        tokens.forEach(t => ngrams.push([t]));
        for (let i = 0; i < tokens.length - 1; i++) ngrams.push([tokens[i], tokens[i+1]]);

        ngrams.forEach(ngram => {
            const phrase = ngram.join(' ');
            const stem = this._stemWord(phrase);
            const matches = this.conceptMap[phrase] || this.conceptMap[stem];

            if (matches && Array.isArray(matches)) {
                // حساب متوسط معامل الانتباه لكلمات الـ N-gram
                let attentionFactor = ngram.reduce((sum, word) => sum + (attentionMap[word] || 0.5), 0) / ngram.length;
                
                // تضخيم معامل الانتباه لجعل الفرق واضحاً (من 0.5-1.5 إلى تأثير حقيقي)
                const attentionBoost = 1 + (attentionFactor * 2);

                matches.forEach(m => {
                    const id = m.concept;
                    const clinicalBase = this.CLINICAL_WEIGHTS[id] || this.CLINICAL_WEIGHTS.neutral;
                    
                    // تطبيق المعادلة الثلاثية
                    const finalImpact = m.weight * clinicalBase * attentionBoost;

                    if (!found[id]) {
                        console.log(`      🎯 [Match]: [${id}] -> Base: ${m.weight}, Clinical: ${clinicalBase}, AttentionBoost: ${attentionBoost.toFixed(2)}`);
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
            }
        });

        return found;
    }

    /**
     * اختيار المفهوم المسيطر بناءً على "الأثر الإجمالي" (Impact)
     */
    _identifyDominantWeightedTheme(concepts) {
        const sorted = Object.entries(concepts).sort((a,b) => b[1].impact - a[1].impact);
        if (sorted.length === 0) return { id: "neutral", totalWeight: 0 };

        return {
            id: sorted[0][0],
            totalWeight: sorted[0][1].impact,
            confidence: Math.min(1, sorted[0][1].impact / 5) // مقياس ثقة مبسط
        };
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

    _stemWord(word) {
        let result = word;
        for (const p of this.prefixes) {
            if (result.startsWith(p) && result.length > p.length + 2) {
                let temp = result.substring(p.length);
                if (this.conceptMap[temp]) return temp;
            }
        }
        return result;
    }
}

export default SemanticEngine;
