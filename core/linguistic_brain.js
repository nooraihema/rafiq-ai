
// /core/linguistic_brain_v4.js
// LinguisticBrain v8.0 - Situational Awareness & High-Fidelity Edition
// ====================================================================

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';
import { AttentionLayer } from './attention_layer.js';
import { ReasoningEngine } from './reasoning_engine.js';
import { KnowledgeEngine } from './knowledge_engine.js';

// استيراد المكونات الجديدة (بوابة الوعي)
import { HighFidelityReader } from './high_fidelity_reader.js';
import { StateSynthesizer } from './state_synthesizer.js';
import SITUATIONAL_CONTEXT from './situational_context.js';

const DEFAULT_OPTIONS = {
  debug: true,
  dictionaryFileNames: {
    affixes: 'affixes.js',
    emotional_anchors: 'emotional_anchors.js',
    intensity_analyzer: 'intensity_analyzer.js',
    psychological_concepts_engine: 'psychological_concepts_engine.js',
    psychological_patterns_hyperreal: 'psychological_patterns_hyperreal.js',
    behavior_values_defenses: 'behavior_values_defenses.js',
    generative_responses_engine: 'generative_responses_engine.js',
    stop_words: 'stop_words.js',
    emotional_dynamics_engine: 'emotional_dynamics_engine.js'
  }
};

export class LinguisticBrain {
    constructor(memorySystem, opts = {}) {
        console.log("%c🧠 [Constructor] Creating LinguisticBrain v8.0 (Full Consciousness)...", "color: #2196F3; font-weight: bold;");
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.engines = {};
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log("%c=======================================", "color: #4CAF50");
        console.log("%c🧠 Brain Initialization Started (V8.0)", "color: #4CAF50; font-weight: bold;");
        console.log("%c=======================================", "color: #4CAF50");

        // --- الخطوة 1: تحميل القواميس بدقة (Safe Import) ---
        const dictFileNames = this.options.dictionaryFileNames;
        const promises = Object.entries(dictFileNames).map(async ([key, fileName]) => {
            try {
                const mod = await import(`../dictionaries/${fileName}`);
                this.dictionaries[key] = mod; 
                console.log(`   ✅ Loaded: %c${key}`, "color: #8BC34A;");
            } catch (e) { console.error(`   ❌ Failed: ${key}`, e); }
        });
        await Promise.all(promises);

        // --- الخطوة 2: تجهيز إعدادات المحركات ---
        const semanticConfig = {
            CONCEPT_MAP: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP || {},
            CONCEPT_DEFINITIONS: this.dictionaries.psychological_concepts_engine?.CONCEPT_DEFINITIONS || {},
            AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY || this.dictionaries.affixes || {},
            STOP_WORDS_SET: this.dictionaries.stop_words?.STOP_WORDS_SET || this.dictionaries.stop_words || new Set()
        };

        const emotionConfig = {
            EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors?.EMOTIONAL_DICTIONARY || this.dictionaries.emotional_anchors || {},
            INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer?.HIERARCHICAL_MODIFIERS || this.dictionaries.intensity_analyzer || {},
            AFFIX_DICTIONARY: semanticConfig.AFFIX_DICTIONARY
        };

        // --- الخطوة 3: بناء المحركات (التسلسل المطور) ---
        try {
            // [بوابة الوعي 1]: القارئ فائق الدقة
            this.engines.reader = new HighFidelityReader({
                anchors: emotionConfig.EMOTIONAL_ANCHORS,
                concepts: semanticConfig.CONCEPT_MAP,
                stopWords: semanticConfig.STOP_WORDS_SET,
                affixes: semanticConfig.AFFIX_DICTIONARY
            });

            // [بوابة الوعي 2]: مترجم الحالة الكلية
            this.engines.synthesizer = new StateSynthesizer();

            // 1. طبقة الانتباه
            this.engines.attention = new AttentionLayer({
                anchors: emotionConfig.EMOTIONAL_ANCHORS,
                concepts: semanticConfig.CONCEPT_MAP,
                stopWords: semanticConfig.STOP_WORDS_SET
            });

            // 2. المحرك الدلالي
            this.engines.semantic = new SemanticEngine(semanticConfig);

            // 3. محرك العواطف
            this.engines.emotion = new EmotionEngine(emotionConfig);

            // 4. محرك التركيب
            this.engines.synthesis = new SynthesisEngine({
                PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {},
                BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses || {}
            });

            // 5. المحرك الاستراتيجي
            this.engines.reasoning = new ReasoningEngine(this.memory);

            // 6. أمين المكتبة السريرية
            this.engines.knowledge = new KnowledgeEngine();

            // 7. محرك الرد
            this.engines.catharsis = new CatharsisEngine(
                { 
                    GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine || {},
                    EMOTIONAL_DYNAMICS: this.dictionaries.emotional_dynamics_engine || {},
                    PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {}
                },
                {},
                this.memory
            );

            console.log("%c   🎉 CONSCIOUSNESS PIPELINE FULLY LINKED", "color: #4CAF50; font-weight: bold;");
        } catch (e) {
            console.error("❌ Engine Instantiation Failed:", e);
            throw e;
        }

        this._isInitialized = true;
        return this;
    }

    /**
     * البايبلاين المطور: (Reader -> GlobalState -> Attention -> Logic)
     */
    async analyze(rawText, context = {}) {
        if (!this._isInitialized) return null;
        
        console.log("\n" + "%c🚀 STARTING INTEGRATED CONSCIOUSNESS PIPELINE".repeat(1), "color: #fff; background: #E91E63; padding: 4px;");
        const start = Date.now();

        try {
            // [Phase 0]: القراءة فائقة الدقة (التشريح الكامل لكل كلمة)
            const readerResult = await this.engines.reader.read(rawText);
            const tokens = readerResult.sequence.map(t => t.original);
            const stems = readerResult.sequence.map(t => t.core);

            // [Phase 1]: تركيب الحالة الكلية (فهم الموقف قبل المشاعر)
            const globalState = await this.engines.synthesizer.synthesize(readerResult, this.memory.workingMemory || []);

            // [Phase 2]: الانتباه (Salience)
            const attentionResult = await this.engines.attention.process(tokens, stems);
            const attentionMap = attentionResult.salienceMap;

            // [Phase 3]: التحليل الأساسي
            const [semanticMap, emotionProfile] = await Promise.all([
                this.engines.semantic.analyze(rawText, { ...context, attentionMap, globalState }),
                this.engines.emotion.analyze(rawText, { ...context, attentionMap, globalState })
            ]);

            // [Phase 4]: التركيب الاستنتاجي
            const synthesisProfile = await this.engines.synthesis.analyze({ semanticMap, emotionProfile });

            // [Phase 5]: الاستدلال واتخاذ القرار الاستراتيجي
            const strategicInsight = await this.engines.reasoning.computeStrategicInsight({
                emotionProfile, semanticMap, attentionMap, synthesisProfile, globalState
            });

            // [Phase 6]: استشارة المكتبة السريرية (RAG)
            const clinicalInsights = await this.engines.knowledge.consultLibrary({
                semanticMap, attentionMap, globalState
            });

            return { 
                rawText, readerResult, globalState, semanticMap, emotionProfile, 
                synthesisProfile, strategicInsight, clinicalInsights, attentionMap,
                _meta: { duration: Date.now() - start, focus: attentionResult.focusToken } 
            };
        } catch (error) {
            console.error("❌ Pipeline Crash:", error);
            return null;
        }
    }

    async generateResponse(insight) {
        if (!this._isInitialized || !insight) return null;
        try {
            console.log("%c[Pipeline Final] Orchestrating Conscious Response...", "color: #9C27B0; font-weight: bold;");
            const response = await this.engines.catharsis.generateResponse(insight);
            
            // Logs الاستراتيجية
            const dnaName = response.emotionalDNA?.name || "standard";
            console.log(`🎯 Master Intent: %c${insight.strategicInsight.masterIntent.type}`, "color: #FF5722; font-weight: bold;");
            console.log(`🧬 DNA Mix: %c${dnaName}`, "color: #FF5722; font-weight: bold;");
            
            return response;
        } catch (error) {
            console.error("❌ Generation Failed:", error);
            return { responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك." };
        }
    }

    async process(rawText, context = {}) {
        const insight = await this.analyze(rawText, context);
        if (!insight) return { insight: null, response: { responseText: "عذراً، حدث خطأ تقني." } };
        const response = await this.generateResponse(insight);
        return { insight, response };
    }
}

export default LinguisticBrain;

