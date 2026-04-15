
// /core/linguistic_brain_v4.js
// LinguisticBrain v10.1 - Unified Workspace & Sovereign Learning (Stable Edition)
// ====================================================================

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';
import { AttentionLayer } from './attention_layer.js';
import { ReasoningEngine } from './reasoning_engine.js';
import { KnowledgeEngine } from './knowledge_engine.js';

// استيراد المكونات المتقدمة
import { HighFidelityReader } from './high_fidelity_reader.js';
import { StateSynthesizer } from './state_synthesizer.js';
import { UnifiedWorkspace } from './workspace.js';
import { UltimateKnowledgeEngine } from './ultimate_knowledge_engine.js';

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
        console.log("%c🧠 [Constructor] Creating LinguisticBrain v10.1...", "color: #2196F3; font-weight: bold;");
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.engines = {};
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log("%c=======================================", "color: #4CAF50");
        console.log("%c🧠 Brain Initialization Started (V10.1)", "color: #4CAF50; font-weight: bold;");
        console.log("%c=======================================", "color: #4CAF50");

        // --- الخطوة 1: تحميل القواميس ---
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

        // --- الخطوة 3: بناء المحركات (إصدار الفضاء الموحد) ---
        try {
            this.engines.reader = new HighFidelityReader({
                anchors: emotionConfig.EMOTIONAL_ANCHORS,
                concepts: semanticConfig.CONCEPT_MAP,
                stopWords: semanticConfig.STOP_WORDS_SET,
                affixes: semanticConfig.AFFIX_DICTIONARY
            });

            this.engines.attention = new AttentionLayer({
                anchors: emotionConfig.EMOTIONAL_ANCHORS,
                concepts: semanticConfig.CONCEPT_MAP,
                stopWords: semanticConfig.STOP_WORDS_SET
            });

            this.engines.synthesizer = new StateSynthesizer();
            this.engines.semantic = new SemanticEngine(semanticConfig);
            this.engines.emotion = new EmotionEngine(emotionConfig);
            this.engines.synthesis = new SynthesisEngine({
                PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {},
                BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses || {}
            });
            this.engines.reasoning = new ReasoningEngine(this.memory);
            this.engines.knowledge = new KnowledgeEngine();
            
            this.engines.learner = new UltimateKnowledgeEngine({
                stopWords: semanticConfig.STOP_WORDS_SET,
                concepts: semanticConfig.CONCEPT_MAP,
                synonyms: this.dictionaries.generative_responses_engine?.LEXICAL_POOLS?.synonyms || {}
            });

            this.engines.catharsis = new CatharsisEngine(
                { 
                    GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine || {},
                    EMOTIONAL_DYNAMICS: this.dictionaries.emotional_dynamics_engine || {},
                    PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {}
                },
                {},
                this.memory
            );

            console.log("%c   🎉 GLOBAL WORKSPACE PIPELINE READY", "color: #4CAF50; font-weight: bold;");
        } catch (e) {
            console.error("❌ Engine Instantiation Failed:", e);
            throw e;
        }

        this._isInitialized = true;
        return this;
    }

    async feedBookKnowledge(text) {
        if (!this._isInitialized) await this.init();
        console.log("%c📚 [Brain Learning]: جاري امتصاص المعرفة الجديدة...", "color: #00E5FF; font-weight: bold;");
        return await this.engines.learner.digest(text);
    }

    /**
     * البايبلاين المصلح (Workspace-Oriented)
     */
    async analyze(rawText, context = {}) {
        if (!this._isInitialized) return null;
        
        // 1. إنشاء الفضاء الموحد
        const workspace = new UnifiedWorkspace(rawText);
        const start = Date.now();

        try {
            // [Phase 0]: تشريح العقد (Ingest بدل read)
            await this.engines.reader.ingest(workspace);

            // [Phase 1]: شحن طاقة الانتباه
            await this.engines.attention.process(workspace);

            // [Phase 2]: تحليل الموقف والمسار الزمني
            const history = (this.memory && this.memory.workingMemory) ? this.memory.workingMemory : [];
            await this.engines.synthesizer.synthesize(workspace, history);

            // [Phase 3]: الإثراء الدلالي والعاطفي (يعملان مباشرة على الـ workspace)
            await Promise.all([
                this.engines.semantic.analyze(workspace, context),
                this.engines.emotion.analyze(workspace, context)
            ]);

            // [Phase 4]: التركيب النفسي (Synthesis)
            await this.engines.synthesis.analyze(workspace, context);

            // [Phase 5]: الاستدلال واتخاذ القرار (Reasoning)
            await this.engines.reasoning.computeStrategicInsight(workspace);

            // [Phase 6]: استشارة المكتبة السريرية
            workspace.clinicalInsights = await this.engines.knowledge.consultLibrary(workspace);

            // [Phase 7]: دمج الذاكرة السيادية المكتسبة
            workspace.sovereignGraph = this.engines.learner.knowledgeGraph;

            // طباعة التقرير النهائي
            workspace.generateFieldReport();

            return workspace; // نعيد الـ Workspace كاملاً
        } catch (error) {
            console.error("❌ Pipeline Crash:", error);
            return null;
        }
    }

    async generateResponse(workspace) {
        if (!this._isInitialized || !workspace) return null;
        try {
            console.log("%c[Pipeline Final] Orchestrating Response...", "color: #9C27B0; font-weight: bold;");
            
            // تمرير الـ workspace بالكامل لـ Catharsis v4.0/5.0
            const response = await this.engines.catharsis.generateResponse(workspace);
            
            const dnaName = response.emotionalDNA?.name || "dynamic_model";
            console.log(`🎯 Master Intent: %c${workspace.state.finalIntent || workspace.state.intent}`, "color: #FF5722; font-weight: bold;");
            console.log(`🧬 DNA Mix: %c${dnaName}`, "color: #FF5722; font-weight: bold;");
            
            return response;
        } catch (error) {
            console.error("❌ Response Engineering Failed:", error);
            return { responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك." };
        }
    }

    async process(rawText, context = {}) {
        const workspace = await this.analyze(rawText, context);
        if (!workspace) return { insight: null, response: { responseText: "عذراً، حدث خطأ في معالجة الوعي." } };
        
        const response = await this.generateResponse(workspace);
        return { insight: workspace, response };
    }
}

export default LinguisticBrain;
