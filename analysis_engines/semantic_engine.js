
/**
 * /analysis_engines/semantic_engine.js
 * SemanticEngine v4.5 - Smart Lexical & Psychological Analyzer
 * المحرك الدلالي: مسؤول عن استخراج المفاهيم، الأهداف المستترة، والشبكة الدلالية.
 */

import { normalizeArabic, tokenize, generateNgrams } from '../core/utils.js';

export class SemanticEngine {
    constructor(dictionaries = {}) {
        console.log("%c🧠 [SemanticEngine] جاري تشغيل المحرك الدلالي الذكي...", "color: #673AB7; font-weight: bold;");

        // ربط القواميس الممررة من LinguisticBrain
        this.conceptMap = dictionaries.CONCEPT_MAP || {};
        this.conceptDefs = dictionaries.CONCEPT_DEFINITIONS || {};
        this.affixes = dictionaries.AFFIX_DICTIONARY || {};
        this.stopWords = dictionaries.STOP_WORDS_SET || new Set();
        
        // تجهيز أدوات التجذير (Stemming)
        this.prefixes = (this.affixes.prefixes || []).map(p => p.value).sort((a,b) => b.length - a.length);
        this.suffixes = (this.affixes.suffixes || []).map(s => s.value).sort((a,b) => b.length - a.length);

        console.log(`✅ [SemanticEngine] تم تجهيز ${Object.keys(this.conceptMap).length} نقطة دلالية.`);
    }

    /**
     * الوظيفة الرئيسية: تحليل النص لغوياً ونفسياً
     */
    async analyze(rawText, context = {}) {
        console.log("\n" + "%c[Semantic Analysis] START".repeat(1), "background: #673AB7; color: #fff; padding: 2px 5px;");
        
        // 1. التنظيف والتقطيع
        const normalized = normalizeArabic(rawText.toLowerCase());
        const tokens = tokenize(normalized);
        console.log(`   🔸 [Step 1: Tokens] تم تقطيع النص إلى ${tokens.length} كلمات.`);

        // 2. استخراج المفاهيم (مع التجذير والبحث في الـ N-grams)
        const concepts = this._extractConcepts(tokens);
        
        // 3. بناء الشبكة الدلالية (الروابط بين المفاهيم)
        const network = this._buildNetwork(concepts);

        // 4. استنتاج الأهداف المستترة (Hidden Goals)
        const hiddenGoals = this._inferHiddenGoals(concepts);

        // 5. تقييم السياق العميق
        const deepContext = this._evaluateDeepContext(concepts, context);

        console.log(`   ✅ [Analysis Complete] تم العثور على ${Object.keys(concepts).length} مفاهيم نفسية.`);
        
        return {
            concepts,
            network,
            hiddenGoals,
            deepContext,
            dominantTheme: this._identifyDominantTheme(concepts),
            _meta: {
                engineVersion: "4.5-Smart",
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * استخراج المفاهيم باستخدام البحث المتعدد (Direct, Stemmed, N-grams)
     */
    _extractConcepts(tokens) {
        console.log("   🔸 [Step 2: Extraction] جاري البحث في القواميس الدلالية...");
        const found = {};

        // إنشاء N-grams (كلمات ثنائية وثلاثية) للبحث عن مثل "اكتئاب شديد"
        const grams3 = generateNgrams(tokens, 3) || [];
        const grams2 = generateNgrams(tokens, 2) || [];
        const ngrams = [...grams3, ...grams2, ...tokens.map(t => [t])];

        ngrams.forEach(ngram => {
            const text = ngram.join(' ');
            const norm = normalizeArabic(text);

            // 1. محاولة المطابقة المباشرة
            let match = this.conceptMap[norm];
            let matchedKey = norm;

            // 2. إذا فشل، محاولة التجذير ( Stemming) للكلمات المفردة فقط
            if (!match && ngram.length === 1) {
                const stemmed = this._stemWord(norm);
                if (this.conceptMap[stemmed]) {
                    match = this.conceptMap[stemmed];
                    matchedKey = stemmed;
                    console.log(`      ✨ [Stem Match]: "${norm}" -> "${stemmed}"`);
                }
            }

            if (match) {
                match.forEach(mapping => {
                    const conceptId = mapping.concept;
                    if (!found[conceptId]) {
                        console.log(`      🎯 [Found]: اكتشاف مفهوم [${conceptId}] عبر النص "${text}"`);
                        found[conceptId] = {
                            id: conceptId,
                            weight: mapping.weight,
                            definition: this.conceptDefs[conceptId] || {},
                            occurrenceCount: 1
                        };
                    } else {
                        found[conceptId].occurrenceCount++;
                    }
                });
            }
        });

        return found;
    }

    /**
     * وظيفة التجذير الذكي: تقص الزوائد فقط إذا كان الناتج موجوداً في القاموس
     */
    _stemWord(word) {
        let result = word;
        // قص السوابق (Prefixes)
        for (const p of this.prefixes) {
            if (result.startsWith(p) && result.length > p.length + 2) {
                let temp = result.substring(p.length);
                if (this.conceptMap[temp]) return temp;
            }
        }
        // قص اللواحق (Suffixes)
        for (const s of this.suffixes) {
            if (result.endsWith(s) && result.length > s.length + 2) {
                let temp = result.substring(0, result.length - s.length);
                if (this.conceptMap[temp]) return temp;
            }
        }
        return result;
    }

    /**
     * بناء الشبكة الدلالية (كيف ترتبط المفاهيم المكتشفة ببعضها)
     */
    _buildNetwork(foundConcepts) {
        console.log("   🔸 [Step 3: Networking] جاري بناء شبكة العلاقات بين المفاهيم...");
        const connections = [];
        const keys = Object.keys(foundConcepts);

        keys.forEach((id, index) => {
            const def = foundConcepts[id].definition;
            if (def.links) {
                def.links.forEach(link => {
                    if (keys.includes(link.concept)) {
                        console.log(`      🔗 [Link]: ربط المفهوم [${id}] بـ [${link.concept}] (علاقة: ${link.type})`);
                        connections.push({ from: id, to: link.concept, type: link.type });
                    }
                });
            }
        });
        return connections;
    }

    /**
     * استنتاج الأهداف المستترة (Hidden Goals) بناءً على المفاهيم المكتشفة
     */
    _inferHiddenGoals(concepts) {
        console.log("   🔸 [Step 4: Inference] جاري استنتاج الأهداف النفسية المستترة...");
        const goals = [];
        if (concepts['helplessness']) {
            goals.push({ goal: "البحث عن السيطرة (Control)", rationale: "ناتج عن شعور بالعجز" });
        }
        if (concepts['self_blame']) {
            goals.push({ goal: "طلب الغفران/التثبيت", rationale: "ناتج عن لوم الذات" });
        }
        return goals;
    }

    /**
     * تقييم السياق العميق (Deep Context)
     */
    _evaluateDeepContext(concepts, context) {
        const keys = Object.keys(concepts);
        return {
            isCrisisPotential: keys.some(k => (concepts[k].definition.risk_level || 0) > 0),
            primaryFocus: keys[0] || "general",
            recurrentThemes: context.history?.themes || []
        };
    }

    _identifyDominantTheme(concepts) {
        const sorted = Object.entries(concepts).sort((a,b) => b[1].weight - a[1].weight);
        return sorted[0]?.[0] || "general";
    }
}

export default SemanticEngine;
