
// /core/linguistic_brain_v4.js
// LinguisticBrain v9.0 - Unified Cognitive Workspace Edition
// ====================================================================

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';
import { AttentionLayer } from './attention_layer.js';
import { ReasoningEngine } from './reasoning_engine.js';
import { KnowledgeEngine } from './knowledge_engine.js';

// استيراد المكونات المتقدمة (بوابة الوعي والفضاء الموحد)
import { HighFidelityReader } from './high_fidelity_reader.js';
import { StateSynthesizer } from './state_synthesizer.js';
import { UnifiedWorkspace } from './workspace.js'; // الاستيراد الحيوي الجديد
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
        console.log("%c🧠 [Constructor] Creating LinguisticBrain v9.0 (Global Workspace)...", "color: #2196F3; font-weight: bold;");
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.engines = {};
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log("%c=======================================", "color: #4CAF50");
        console.log("%c🧠 Brain Initialization Started (V9.0)", "color: #4CAF50; font-weight: bold;");
        console.log("%c=======================================", "color: #4CAF50");

        // --- الخطوة 1: تحميل القواميس الآمن ---
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

        // --- الخطوة 3: بناء المحركات (الجيل السادس - Workspace Ready) ---
        try {
            // [المرحلة 0]: القارئ فائق الدقة (Constructs the Field)
            this.engines.reader = new HighFidelityReader({
                anchors: emotionConfig.EMOTIONAL_ANCHORS,
                concepts: semanticConfig.CONCEPT_MAP,
                stopWords: semanticConfig.STOP_WORDS_SET,
                affixes: semanticConfig.AFFIX_DICTIONARY
            });

            // [المرحلة 1]: شاحن طاقة الانتباه (Field Energizer)
            this.engines.attention = new AttentionLayer({
                anchors: emotionConfig.EMOTIONAL_ANCHORS,
                concepts: semanticConfig.CONCEPT_MAP,
                stopWords: semanticConfig.STOP_WORDS_SET
            });

            // [المرحلة 2]: مترجم الموقف (Context Architect)
            this.engines.synthesizer = new StateSynthesizer();

            // [المرحلة 3]: المحلل الدلالي (Semantic Enricher)
            this.engines.semantic = new SemanticEngine(semanticConfig);

            // [المرحلة 4]: محرك العواطف (Emotion Enricher)
            this.engines.emotion = new EmotionEngine(emotionConfig);

            // [المرحلة 5]: محرك التركيب (Cognitive Weaver)
            this.engines.synthesis = new SynthesisEngine({
                PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {},
                BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses || {}
            });

            // [المرحلة 6]: المحرك الاستراتيجي (Strategic Hub)
            this.engines.reasoning = new ReasoningEngine(this.memory);

            // [المرحلة 7]: أمين المكتبة (RAG Engine)
            this.engines.knowledge = new KnowledgeEngine();

            // [المرحلة 8]: مهندس الرد النهائي (Response Architect)
            this.engines.catharsis = new CatharsisEngine(
                { 
                    GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine || {},
                    EMOTIONAL_DYNAMICS: this.dictionaries.emotional_dynamics_engine || {},
                    PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {}
                },
                {},
                this.memory
            );

            console.log("%c   🎉 GLOBAL WORKSPACE PIPELINE FULLY INTEGRATED", "color: #4CAF50; font-weight: bold;");
        } catch (e) {
            console.error("❌ Engine Instantiation Failed:", e);
            throw e;
        }

        this._isInitialized = true;
        return this;
    }

    /**
     * عملية التحليل الكبرى داخل فضاء المعنى الموحد
     */
    async analyze(rawText, context = {}) {
        if (!this._isInitialized) return null;
        
        // 1. إنشاء فضاء المعنى الموحد للجملة (The Holy Grail)
        const workspace = new UnifiedWorkspace(rawText);
        const start = Date.now();

        try {
            // [Phase 0]: حقن النص وبناء نسيج العقد
            await this.engines.reader.ingest(workspace);

            // [Phase 1]: شحن المجال بطاقة الانتباه
            await this.engines.attention.process(workspace);

            // [Phase 2]: تحليل الموقف والمسار الزمني
            const history = (this.memory && this.memory.workingMemory) ? this.memory.workingMemory : [];
            await this.engines.synthesizer.synthesize(workspace, history);

            // [Phase 3]: الإثراء المتوازي (الدلالي والعاطفي)
            // المحركان الآن يقرآن ويكتبان في نفس الـ Workspace لحظياً
            await Promise.all([
                this.engines.semantic.analyze(workspace, context),
                this.engines.emotion.analyze(workspace, context)
            ]);

            // [Phase 4]: التركيب الاستنتاجي للروابط
            await this.engines.synthesis.analyze(workspace, context);

            // [Phase 5]: اتخاذ القرار الاستراتيجي (الاستدلال)
            await this.engines.reasoning.computeStrategicInsight(workspace);

            // [Phase 6]: استشارة المكتبة السريرية بناءً على نسيج المجال
            workspace.clinicalInsights = await this.engines.knowledge.consultLibrary(workspace);

            // طباعة تقرير الميدان النهائي للمبرمج
            workspace.generateFieldReport();

            return workspace; // نعيد الـ Workspace كاملاً ليكون هو الـ Insight
        } catch (error) {
            console.error("❌ Pipeline Crash in Workspace Mode:", error);
            return null;
        }
    }

    async generateResponse(workspace) {
        if (!this._isInitialized || !workspace) return null;
        try {
            console.log("%c[Pipeline Final] Orchestrating Workspace Response...", "color: #9C27B0; font-weight: bold;");
            
            // نمرر الـ Workspace بالكامل لمحرك الرد
            const response = await this.engines.catharsis.generateResponse(workspace);
            
            // استعراض الحالة النهائية للوعي
            const dnaName = response.emotionalDNA?.name || "dynamic_model";
            console.log(`🎯 Final Master Intent: %c${workspace.state.finalIntent}`, "color: #FF5722; font-weight: bold;");
            console.log(`🧬 Active DNA Mix: %c${dnaName}`, "color: #FF5722; font-weight: bold;");
            
            return response;
        } catch (error) {
            console.error("❌ Response Engineering Failed:", error);
            return { responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك أنا سامعك." };
        }
    }

    async process(rawText, context = {}) {
        // دورة الوعي الكاملة
        const workspace = await this.analyze(rawText, context);
        if (!workspace) return { insight: null, response: { responseText: "عذراً، حدث خطأ في معالجة الوعي الموحد." } };
        
        const response = await this.generateResponse(workspace);
        return { insight: workspace, response };
    }
}

export default LinguisticBrain;
