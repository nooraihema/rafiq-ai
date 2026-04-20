
/**
 * /core/lexical_processor.js
 * LexicalProcessor v5.0 - [ULTIMATE TRANSCENDENT EDITION]
 * المايسترو المركزي: المحرك الذي لا يترك شاردة ولا واردة في النص.
 */

// استيراد القواميس العشرة
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

import { normalizeArabic, tokenize } from './utils.js';

class LexicalProcessor {
    constructor() {
        console.log("%c🧠 [LexicalProcessor] الإعداد الفائق للمحرك الموحد...", "color: #FF5722; font-weight: bold;");
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
        
        // تجهيز الفهارس السريعة
        this.prefixes = this.dictionaries.affixes.prefixes.map(p => p.value).sort((a,b) => b.length - a.length);
        this.suffixes = this.dictionaries.affixes.suffixes.map(s => s.value).sort((a,b) => b.length - a.length);
        
        // إحصائيات العمل (للتأكد من عمل القواميس)
        this.stats = {};
    }

    process(rawText) {
        const startTime = Date.now();
        this._resetStats();
        
        const cleanText = normalizeArabic(rawText.toLowerCase());
        
        // 1. نظام الـ N-Grams: البحث عن التعبيرات الطويلة أولاً لضمان عدم تفتيتها
        const phrases = this._extractPhrases(cleanText);
        
        const goldPlate = {
            metadata: { input: rawText, timestamp: startTime, duration: 0 },
            nodes: [], // الكلمات والتعبيرات المحللة
            summary: {
                primaryEmotions: [],
                compositeState: null, // من محرك الديناميكيات
                activeConcepts: [],
                causalChains: [],
                narrativeTensions: [],
                behavioralMarkers: [],
                globalIntensity: 1.0,
                dna: null,
                riskLevel: 0
            }
        };

        // 2. تحليل كل وحدة (كلمة أو تعبير مركّب)
        phrases.forEach((phrase, index) => {
            const node = this._analyzeNode(phrase, index, phrases);
            if (node) goldPlate.nodes.push(node);
        });

        // 3. التحليلات العليا (Cross-Engine Synthesis)
        this._applyHigherLogic(goldPlate);

        // 4. تقرير الحالة النهائي
        goldPlate.metadata.duration = Date.now() - startTime;
        this._printHealthReport(goldPlate);

        return goldPlate;
    }

    /**
     * يستخرج التعبيرات المكونة من (1-3 كلمات) الموجودة في القواميس
     */
    _extractPhrases(text) {
        const words = text.split(/\s+/);
        const result = [];
        let i = 0;

        while (i < words.length) {
            // محاولة مطابقة 3 كلمات، ثم 2، ثم 1
            let matched = false;
            for (let len = 3; len >= 1; len--) {
                if (i + len <= words.length) {
                    const candidate = words.slice(i, i + len).join(' ');
                    if (this._isInAnyDictionary(candidate) || len === 1) {
                        result.push(candidate);
                        i += len;
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched) { result.push(words[i]); i++; }
        }
        return result;
    }

    _analyzeNode(phrase, index, allPhrases) {
        if (this.dictionaries.stopWords.has(phrase)) return null;

        const stem = this._applyStemming(phrase);
        const node = {
            text: phrase,
            stem: stem,
            index: index,
            emotion: this._lookupEmotion(phrase, stem),
            concepts: this._lookupConcepts(phrase, stem),
            behavior: this._lookupBehavior(phrase, stem),
            intensity: this._lookupIntensity(phrase),
            isNegated: this._checkNegation(index, allPhrases),
            importance: 0.5
        };

        // تحديث الإحصائيات
        if (node.emotion) this.stats.anchors++;
        if (node.concepts.length > 0) this.stats.concepts++;
        if (node.behavior) this.stats.behaviors++;
        if (node.intensity.multiplier !== 1) this.stats.intensity++;

        return node;
    }

    /**
     * تطبيق القوانين العليا: الديناميكيات، الأنماط، والتوترات
     */
    _applyHigherLogic(plate) {
        const concepts = plate.nodes.flatMap(n => n.concepts.map(c => c.id));
        const emotions = plate.nodes.filter(n => n.emotion).map(n => n.emotion.name);

        // أ. البحث عن الأنماط السببية (Causal Patterns)
        plate.summary.causalChains = this.dictionaries.patterns.filter(p => 
            p.trigger_concepts.some(tc => concepts.includes(tc))
        );
        if (plate.summary.causalChains.length > 0) this.stats.patterns++;

        // ب. البحث عن التوترات السردية (Narrative Tensions)
        plate.summary.narrativeTensions = this.dictionaries.tensions.filter(t => {
            const poleA = t.pole_a.concepts.some(c => concepts.includes(c));
            const poleB = t.pole_b.concepts.some(c => concepts.includes(c));
            return poleA && poleB;
        });
        if (plate.summary.narrativeTensions.length > 0) this.stats.tensions++;

        // ج. الديناميكيات العاطفية (المشاعر المركبة)
        const dynamics = this.dictionaries.dynamics;
        for (const [key, state] of Object.entries(dynamics)) {
            const matchCount = state.core_emotions?.filter(e => emotions.includes(e)).length;
            if (matchCount >= 2) {
                plate.summary.compositeState = state;
                this.stats.dynamics++;
                break;
            }
        }

        // د. حساب الشدة الكلية و DNA الرد
        plate.summary.globalIntensity = this._finalizeIntensity(plate);
        plate.summary.dna = this._blendDNA(plate);
        
        // هـ. استخراج العلامات السلوكية
        plate.summary.behavioralMarkers = plate.nodes.filter(n => n.behavior).map(n => n.behavior);
    }

    // --- الوظائف الفرعية (الدقيقة) ---

    _applyStemming(text) {
        if (text.includes(' ')) return text; // لا تجذير للتعبيرات المركبة
        let res = text;
        for (const p of this.prefixes) { if (res.startsWith(p) && res.length > p.length + 2) { res = res.substring(p.length); break; } }
        for (const s of this.suffixes) { if (res.endsWith(s) && res.length > s.length + 2) { res = res.substring(0, res.length - s.length); break; } }
        return res;
    }

    _lookupEmotion(phrase, stem) {
        const entry = this.dictionaries.anchors[phrase] || this.dictionaries.anchors[stem];
        if (entry) return { name: Object.keys(entry.mood_scores)[0], ...entry };
        return null;
    }

    _lookupConcepts(phrase, stem) {
        const mappings = this.dictionaries.conceptMap[phrase] || this.dictionaries.conceptMap[stem];
        return mappings ? mappings.map(m => ({ id: m.concept, weight: m.weight, def: this.dictionaries.concepts[m.concept] })) : [];
    }

    _lookupBehavior(phrase, stem) {
        // البحث في الأنماط السلوكية والدفاعات
        const behaviors = this.dictionaries.behaviors.BEHAVIORAL_PATTERNS;
        const defenses = this.dictionaries.behaviors.DEFENSE_MECHANISMS;
        
        for (const [id, data] of Object.entries(behaviors)) {
            if (phrase.includes(id) || (data.behavioral_signals && data.behavioral_signals.some(s => phrase.includes(s)))) return { id, ...data, type: 'behavior' };
        }
        for (const [id, data] of Object.entries(defenses)) {
            if (phrase.includes(id) || (data.indicators && data.indicators.some(s => phrase.includes(s)))) return { id, ...data, type: 'defense' };
        }
        return null;
    }

    _lookupIntensity(phrase) {
        const flat = {};
        const mods = this.dictionaries.intensity;
        for (const group in mods) {
            for (const layer in mods[group]) {
                for (const word in mods[group][layer]) {
                    if (phrase === word) return { multiplier: mods[group][layer][word].multiplier || 1, group };
                }
            }
        }
        return { multiplier: 1, group: null };
    }

    _checkNegation(index, all) {
        const negators = ["مش", "لا", "ما", "لم", "لن", "ليس"];
        return index > 0 && negators.includes(all[index - 1]);
    }

    _isInAnyDictionary(phrase) {
        return !!(this.dictionaries.anchors[phrase] || this.dictionaries.conceptMap[phrase] || this._lookupIntensity(phrase).multiplier !== 1);
    }

    _finalizeIntensity(plate) {
        let total = 1.0;
        plate.nodes.forEach(n => {
            if (n.intensity.multiplier !== 1) total *= n.intensity.multiplier;
            if (n.isNegated) total *= 0.8; // النفي يقلل حدة الشعور المباشر أحياناً
        });
        return Math.min(2.5, total);
    }

    _blendDNA(plate) {
        const primary = plate.nodes.find(n => n.emotion)?.emotion?.name || 'dynamic';
        const intensity = plate.summary.globalIntensity;
        if (intensity > 1.5) return EMOTIONAL_DNA.poetic;
        if (['sadness', 'fear'].includes(primary)) return EMOTIONAL_DNA.tender;
        return EMOTIONAL_DNA.dynamic;
    }

    _resetStats() {
        this.stats = { affixes: 0, anchors: 0, concepts: 0, behaviors: 0, intensity: 0, dynamics: 0, patterns: 0, tensions: 0, knowledge: 0 };
    }

    _printHealthReport(goldPlate) {
        console.log(`%c📊 [Gold Plate Report] تم التحليل بنجاح في ${goldPlate.metadata.duration}ms`, "color: #4CAF50; font-weight: bold;");
        console.table(this.stats);
        if (this.stats.anchors === 0 && this.stats.concepts === 0) {
            console.warn("⚠️ تنبيه: لم يتم العثور على أي مشاعر أو مفاهيم. تأكد من أن القواميس ليست فارغة.");
        }
    }
}

export default new LexicalProcessor();
