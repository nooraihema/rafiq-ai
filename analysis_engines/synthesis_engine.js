
// /analysis_engines/semantic_engine.js - Professional Semantic Processor v5.0
// محرك تحليل دلالي احترافي يدعم الاستنتاج، الجذور، والتشابه
// تم تعديل التصدير ليكون متوافقاً مع معايير المتصفحات (ES Modules)

import { normalizeArabic, tokenize, generateNgrams } from '../core/utils.js';

export class SemanticEngine {
    constructor(dictionaries) {
        // التأكد من وجود خريطة المفاهيم لتجنب الانهيار
        this.conceptMap = dictionaries.CONCEPT_MAP || {}; 
        this.stopWords = dictionaries.STOP_WORDS_SET || new Set();
        this.affixes = dictionaries.AFFIX_DICTIONARY || {}; 
        this._isReady = true;
    }

    /**
     * حساب "مسافة التشابه" بين كلمتين (خوارزمية ليفنشتاين مبسطة)
     * تجعل النظام يفهم الكلمة حتى لو فيها خطأ إملائي أو زيادة حرف
     */
    _calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++) track[0][i] = i;
        for (let j = 0; j <= str2.length; j++) track[j][0] = j;
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1, 
                    track[j - 1][i] + 1, 
                    track[j - 1][i - 1] + indicator
                );
            }
        }
        const distance = track[str2.length][str1.length];
        return 1 - (distance / Math.max(str1.length, str2.length));
    }

    /**
     * استخراج "الجذر الدلالي" للكلمة (Stemming)
     * هذا ما يجعله يفهم (شك، شكوك، يشك) كأنهم شيء واحد
     */
    _getStem(word) {
        if (!word || word.length < 3) return word;
        let stem = word;
        // حذف الزوائد الشائعة في العربية (ال، و، ب، ي، ت، س، مست..)
        const prefixes = ["ال", "وال", "بال", "فال", "لل", "و", "ب", "ف"];
        const suffixes = ["ون", "ين", "ات", "كم", "هم", "نا", "ه", "ي"];
        
        for (let p of prefixes) {
            if (stem.startsWith(p) && stem.length > 3) {
                stem = stem.slice(p.length);
                break; 
            }
        }
        for (let s of suffixes) {
            if (stem.endsWith(s) && stem.length > 3) {
                stem = stem.slice(0, -s.length);
                break;
            }
        }
        return stem;
    }

    /**
     * التحليل الدلالي للنص المستلم
     */
    analyze(rawText) {
        if (!rawText) return { tokens: [], conceptInsights: {}, pivotalConcept: null };

        const tokens = tokenize(rawText, this.stopWords);
        const ngrams = generateNgrams(tokens, [1, 2, 3]);
        const conceptInsights = {};
        let pivotalConcept = null;
        let maxWeight = 0;

        // الدوران على كل العبارات والكلمات المستخرجة من النص
        for (const term of ngrams) {
            const stem = this._getStem(term);
            
            // البحث في خريطة المفاهيم
            for (const [conceptKey, conceptData] of Object.entries(this.conceptMap)) {
                let matchScore = 0;

                // 1. تطابق حرفي مباشر
                if (conceptData.keywords && conceptData.keywords.includes(term)) {
                    matchScore = 1.0;
                }
                
                // 2. تطابق بالجذر (Stem Match)
                else if (conceptData.keywords && conceptData.keywords.some(k => this._getStem(k) === stem)) {
                    matchScore = 0.85;
                }

                // 3. تطابق بالتشابه (Fuzzy Match)
                else if (conceptData.keywords) {
                    for (let kw of conceptData.keywords) {
                        const sim = this._calculateSimilarity(term, kw);
                        if (sim > 0.85) { // إذا كان التشابه أكثر من 85%
                            matchScore = sim * 0.75; 
                            break;
                        }
                    }
                }

                // إذا وجدنا تطابقاً، نقوم بحساب الوزن وتخزينه
                if (matchScore > 0) {
                    const weight = matchScore * (conceptData.baseWeight || 1);
                    
                    if (!conceptInsights[conceptKey]) {
                        conceptInsights[conceptKey] = {
                            concept: conceptKey,
                            totalWeight: 0,
                            matches: []
                        };
                    }

                    conceptInsights[conceptKey].totalWeight += weight;
                    conceptInsights[conceptKey].matches.push(term);

                    // تحديد المفهوم الأساسي (الأعلى وزناً)
                    if (conceptInsights[conceptKey].totalWeight > maxWeight) {
                        maxWeight = conceptInsights[conceptKey].totalWeight;
                        pivotalConcept = conceptKey;
                    }
                }
            }
        }

        return {
            tokens,
            conceptInsights,
            pivotalConcept,
            _meta: { engineVersion: "5.0-Professional-Browser" }
        };
    }
}

// التصدير الافتراضي لضمان عمل الاستدعاء في المتصفح بدون أخطاء
export default SemanticEngine;
