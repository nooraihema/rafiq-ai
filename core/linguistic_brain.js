
// /core/linguistic_brain_v4.js
// LinguisticBrain v7.1 - Knowledge-Augmented & Dictionary-Safe Edition
// ====================================================================

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';
import { AttentionLayer } from './attention_layer.js';
import { ReasoningEngine } from './reasoning_engine.js';
import { KnowledgeEngine } from './knowledge_engine.js';

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
        console.log("%c🧠 [Constructor] Creating LinguisticBrain v7.1 (Robust & Encyclopedic)...", "color: #2196F3; font-weight: bold;");
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.engines = {};
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log("%c=======================================", "color: #4CAF50");
        console.log("%c🧠 Brain Initialization Started (V7.1)", "color: #4CAF50; font-weight: bold;");
        console.log("%c=======================================", "color: #4CAF50");

        // --- الخطوة 1: تحميل القواميس بدقة (Safe Import) ---
        const dictFileNames = this.options.dictionaryFileNames;
        const promises = Object.entries(dictFileNames).map(async ([key, fileName]) => {
            try {
                const mod = await import(`../dictionaries/${fileName}`);
                // نأخذ الموديول بالكامل لضمان الوصول للخصائص المصدرة (Named Exports)
                this.dictionaries[key] = mod; 
                console.log(`   ✅ Loaded & Linked: %c${key}`, "color: #8BC34A;");
            } catch (e) { console.error(`   ❌ Failed to load dictionary: ${key}`, e); }
        });
        await Promise.all(promises);

        // --- الخطوة 2: استخراج الروابط الداخلية للقواميس لضمان وصول البيانات للمحركات ---
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

        const synthesisConfig = {
            PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {},
            BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses || {}
        };

        // --- الخطوة 3: بناء المحركات بالهيكل الصحيح ---
        try {
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
            this.engines.synthesis = new SynthesisEngine(synthesisConfig);

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

            console.log("%c   🎉 ALL SYSTEMS ONLINE WITH FULL DATA LINKAGE", "color: #4CAF50; font-weight: bold;");
        } catch (e) {
            console.error("❌ Critical Failure in Engine Instantiation:", e);
            throw e;
        }

        this._isInitialized = true;
        return this;
    }

    /**
     * البايبلاين الكامل: تحويل النص إلى "إدراك استراتيجي" مدعوم علمياً
     */
    async analyze(rawText, context = {}) {
        if (!this._isInitialized) return null;
        
        console.log("\n" + "%c🚀 Starting Strategic Analysis Pipeline".repeat(1), "color: #fff; background: #2196F3; padding: 3px;");
        const start = Date.now();

        try {
            const normalized = normalizeArabic(rawText.toLowerCase());
            const tokens = tokenize(normalized);

            // [Phase 0]: تشغيل طبقة الانتباه
            const attentionResult = await this.engines.attention.process(tokens);
            const attentionMap = attentionResult.salienceMap;

            // [Phase 1]: التحليل الأساسي (Parallel)
            const [semanticMap, emotionProfile] = await Promise.all([
                this.engines.semantic.analyze(rawText, { ...context, attentionMap }),
                this.engines.emotion.analyze(rawText, { ...context, attentionMap })
            ]);

            // [Phase 2]: التركيب النفسي
            const synthesisProfile = await this.engines.synthesis.analyze({ semanticMap, emotionProfile });

            // [Phase 3]: الاستدلال واتخاذ القرار الاستراتيجي
            const strategicInsight = await this.engines.reasoning.computeStrategicInsight({
                emotionProfile,
                semanticMap,
                attentionMap,
                synthesisProfile
            });

            // [Phase 4]: استشارة المكتبة السريرية (RAG)
            const clinicalInsights = await this.engines.knowledge.consultLibrary({
                semanticMap,
                attentionMap
            });

            const duration = Date.now() - start;
            console.log(`%c⏱ Full Cycle Duration: ${duration}ms`, "color: #757575; font-style: italic;");

            return { 
                rawText, 
                semanticMap, 
                emotionProfile, 
                synthesisProfile, 
                strategicInsight,
                clinicalInsights, 
                attentionMap,
                _meta: { duration, focus: attentionResult.focusToken } 
            };
        } catch (error) {
            console.error("❌ Pipeline Crash:", error);
            return null;
        }
    }

    async generateResponse(insight) {
        if (!this._isInitialized || !insight) return null;

        try {
            console.log("%c[Pipeline 5] Generating Encyclopedic Response...", "color: #9C27B0; font-weight: bold;");
            
            const response = await this.engines.catharsis.generateResponse(insight);
            
            console.log("%c💬 Response Orchestration Complete.", "color: #4CAF50; font-weight: bold;");
            
            const dnaName = response.emotionalDNA?.name || "standard";
            console.log(`🎯 Master Intent: %c${insight.strategicInsight.masterIntent.type}`, "color: #FF5722; font-weight: bold;");
            console.log(`🧬 DNA Mix: %c${dnaName}`, "color: #FF5722; font-weight: bold;");
            
            return response;
        } catch (error) {
            console.error("❌ Error in Response Generation:", error);
            return { responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك أنا سامعك." };
        }
    }

    async process(rawText, context = {}) {
        const insight = await this.analyze(rawText, context);
        if (!insight) return { insight: null, response: { responseText: "عذراً، حدث خطأ في معالجة الوعي." } };

        const response = await this.generateResponse(insight);
        return { insight, response };
    }
}

export default LinguisticBrain;
