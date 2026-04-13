
/**
 * /core/lexical_processor.js
 * المايسترو المركزي: محرك القواميس الموحد (Lexical Master Engine)
 * يقوم بتحويل النص الخام إلى "طبق ذهب" معلوماتي لبقية المحركات.
 */

// استيراد القواميس العشرة (تأكد من صحة المسارات في مشروعك)
import AFFIX_DICTIONARY from '../dictionaries/affixes.js';
import BEHAVIOR_DATA from '../dictionaries/behavior_values_defenses.js';
import { EMOTIONAL_DICTIONARY } from '../dictionaries/emotional_anchors.js';
import { EMOTIONAL_DYNAMICS } from '../dictionaries/emotional_dynamics_engine.js';
import { EMOTIONAL_DNA, LEXICAL_POOLS } from '../dictionaries/generative_responses_engine.js';
import { HIERARCHICAL_MODIFIERS } from '../dictionaries/intensity_analyzer.js';
import knowledgeBaseGeneral from '../dictionaries/knowledgeBaseGeneral.js';
import { CONCEPT_DEFINITIONS, CONCEPT_MAP } from '../dictionaries/psychological_concepts_engine.js';
import { CAUSAL_PATTERNS_V6, NARRATIVE_TENSIONS_V6 } from '../dictionaries/psychological_patterns_hyperreal.js';
import STOP_WORDS_SET from '../dictionaries/stop_words.js';

import { normalizeArabic, tokenize } from './utils.js'; // وظائف مساعدة أساسية

class LexicalProcessor {
    constructor() {
        console.log("🧠 [LexicalProcessor] الإعداد الأولي للمحرك الموحد...");
        this.dictionaries = {
            affixes: AFFIX_DICTIONARY,
            behaviors: BEHAVIOR_DATA,
            anchors: EMOTIONAL_DICTIONARY,
            dynamics: EMOTIONAL_DYNAMICS,
            intensity: HIERARCHICAL_MODIFIERS,
            knowledge: knowledgeBaseGeneral,
            concepts: CONCEPT_DEFINITIONS,
            conceptMap: CONCEPT_MAP,
            patterns: CAUSAL_PATTERNS_V6,
            tensions: NARRATIVE_TENSIONS_V6,
            stopWords: STOP_WORDS_SET
        };
        
        // تجهيز مصفوفات البحث السريع
        this.prefixes = this.dictionaries.affixes.prefixes.map(p => p.value).sort((a,b) => b.length - a.length);
        this.suffixes = this.dictionaries.affixes.suffixes.map(s => s.value).sort((a,b) => b.length - a.length);
        
        console.log("✅ [LexicalProcessor] تم تحميل جميع القواميس العشرة بنجاح.");
    }

    /**
     * الوظيفة الرئيسية: معالجة النص وتحويله لبيانات مهيكلة
     */
    process(rawText) {
        console.log("\n--- 🚀 بداية معالجة الجملة: '" + rawText + "' ---");

        // 1. التنظيف الأولي (Normalization)
        const cleanText = normalizeArabic(rawText.toLowerCase());
        console.log("Step 1 [Normalization]: النص بعد التنظيف -> " + cleanText);

        // 2. التقطيع (Tokenization)
        const tokens = tokenize(cleanText);
        console.log("Step 2 [Tokenization]: الكلمات المستخرجة -> [" + tokens.join(", ") + "]");

        const goldPlate = {
            input: rawText,
            tokens: [],
            detectedEmotions: {},
            detectedConcepts: [],
            causalHits: [],
            intensityScore: 0.5, // قيمة افتراضية
            dnaMix: {},
            recommendations: [],
            riskLevel: 0
        };

        // 3. تحليل الكلمات كلمة بكلمة
        tokens.forEach((token, index) => {
            console.log(`\n🔍 تحليل الكلمة [${index}]: "${token}"`);

            // أ. التحقق من الكلمات المستبعدة (Stop Words)
            if (this.dictionaries.stopWords.has(token)) {
                console.log(`   - [StopWord]: هذه كلمة حشو، سيتم تجاوزها.`);
                return;
            }

            // ب. عملية التجذير (Stemming) باستخدام قاموس affixes
            let stem = this._applyStemming(token);
            
            // ج. البحث في قاموس المفاهيم النفسية
            const conceptHits = this._lookupConcepts(stem, token);
            if (conceptHits.length > 0) {
                goldPlate.detectedConcepts.push(...conceptHits);
            }

            // د. البحث في قاموس المراسي العاطفية
            const emotionHit = this._lookupEmotions(stem, token);
            if (emotionHit) {
                goldPlate.detectedEmotions[emotionHit.name] = emotionHit.data;
            }

            goldPlate.tokens.push({ original: token, stem: stem, concepts: conceptHits });
        });

        // 4. حساب الشدة (Intensity) باستخدام قاموس الشدة
        goldPlate.intensityScore = this._calculateIntensity(cleanText, goldPlate.detectedEmotions);

        // 5. ربط الأنماط السببية (Patterns) باستخدام قاموس الأنماط الفائقة
        goldPlate.causalHits = this._detectPatterns(goldPlate.detectedConcepts.map(c => c.id));

        // 6. اختيار الـ DNA العاطفي للرد باستخدام قاموس التوليد
        goldPlate.dnaMix = this._blendDNA(goldPlate.detectedEmotions, goldPlate.intensityScore);

        console.log("\n--- ✨ اكتملت المعالجة: طبق الذهب جاهز للتصدير ---");
        return goldPlate;
    }

    // --- وظائف مساعدة داخلية للمحرك ---

    _applyStemming(token) {
        let result = token;
        for (const p of this.prefixes) {
            if (result.startsWith(p) && result.length > p.length + 2) {
                result = result.substring(p.length);
                console.log(`   - [Stemming]: تم حذف السابقة "${p}" -> الأصل: "${result}"`);
                break;
            }
        }
        return result;
    }

    _lookupConcepts(stem, original) {
        const hits = [];
        // البحث في خريطة المفاهيم (CONCEPT_MAP)
        const mappings = this.dictionaries.conceptMap[stem] || this.dictionaries.conceptMap[original];
        if (mappings) {
            mappings.forEach(m => {
                console.log(`   - [Concept Found]: اكتشاف مفهوم "${m.concept}" بوزن ${m.weight}`);
                hits.push({ id: m.concept, weight: m.weight, info: this.dictionaries.concepts[m.concept] });
            });
        }
        return hits;
    }

    _lookupEmotions(stem, original) {
        const entry = this.dictionaries.anchors[stem] || this.dictionaries.anchors[original];
        if (entry) {
            const emoName = Object.keys(entry.mood_scores)[0];
            console.log(`   - [Emotion Found]: اكتشاف عاطفة "${emoName}" من قاموس المراسي.`);
            return { name: emoName, data: entry };
        }
        return null;
    }

    _calculateIntensity(text, emotions) {
        let base = Object.keys(emotions).length > 0 ? 0.7 : 0.4;
        // البحث في HIERARCHICAL_MODIFIERS
        for (const [group, layers] of Object.entries(this.dictionaries.intensity)) {
            for (const [layer, words] of Object.entries(layers)) {
                for (const [word, data] of Object.entries(words)) {
                    if (text.includes(word)) {
                        base *= (data.multiplier || 1);
                        console.log(`   - [Intensity Boost]: كلمة "${word}" رفعت الشدة بمقدار ${data.multiplier}x`);
                    }
                }
            }
        }
        return Math.min(1.5, base);
    }

    _detectPatterns(conceptIds) {
        const hits = this.dictionaries.patterns.filter(p => 
            p.trigger_concepts.some(tc => conceptIds.includes(tc))
        );
        if (hits.length > 0) {
            console.log(`   - [Pattern Detected]: تم تفعيل نمط سببي: "${hits[0].pattern_id}"`);
        }
        return hits;
    }

    _blendDNA(emotions, intensity) {
        // منطق بسيط لاختيار الـ DNA بناءً على العاطفة السائدة
        const primary = Object.keys(emotions)[0] || 'dynamic';
        let dna = EMOTIONAL_DNA.dynamic;
        
        if (['sadness', 'loneliness'].includes(primary)) dna = EMOTIONAL_DNA.tender;
        if (intensity > 1.0) dna = EMOTIONAL_DNA.poetic;

        console.log(`   - [DNA Selected]: نمط الرد المختار هو "${dna.name}"`);
        return dna;
    }
}

export default new LexicalProcessor();
