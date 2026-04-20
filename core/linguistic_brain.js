
// /core/linguistic_brain_v4.js
// LinguisticBrain v10.0 - Global Workspace Stability Edition
// تم التعديل لضمان الربط الحديدي بين المحركات والقواميس ومعالجة ثغرات الاستيراد.

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';
import { AttentionLayer } from './attention_layer.js';
import { ReasoningEngine } from './reasoning_engine.js';
import { KnowledgeEngine } from './knowledge_engine.js';
import { HighFidelityReader } from './high_fidelity_reader.js';
import { StateSynthesizer } from './state_synthesizer.js';
import { UnifiedWorkspace } from './workspace.js';

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
        console.log("%c🧠 [System] LinguisticBrain v10.0 Initializing...", "color:#2196F3; font-weight:bold;");
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.engines = {};
        this._isInitialized = false;
    }

    /**
     * دالة مساعدة لضمان استخراج البيانات من القاموس مهما كان نوع التصدير
     */
    _extract(mod) {
        if (!mod) return {};
        // إذا كان القاموس يستخدم export default
        if (mod.default) return mod.default;
        // إذا كان يستخدم named exports، نعيد الموديول كاملاً
        return mod;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log("%c🚀 [Boot] Loading Dictionary Assets...", "color:#4CAF50; font-weight:bold;");

        const dictFileNames = this.options.dictionaryFileNames;

        // تحميل القواميس بشكل متوازي مع فحص الاستيراد
        await Promise.all(Object.entries(dictFileNames).map(async ([key, fileName]) => {
            try {
                const mod = await import(`../dictionaries/${fileName}`);
                this.dictionaries[key] = mod;
                console.log(`   ✅ Asset Loaded: %c${key}`, "color:#009688;");
            } catch (e) {
                console.error(`   ❌ Failed to load asset: ${key} from ${fileName}`, e);
            }
        }));

        // =========================================================
        // 🛠️ التجهيز الحديدي لإعدادات المحركات (Mapping Layer)
        // هنا نربط كل محرك بالبيانات الدقيقة التي يحتاجها
        // =========================================================
        
        const conceptsMod = this.dictionaries.psychological_concepts_engine;
        const anchorsMod = this.dictionaries.emotional_anchors;
        const intensityMod = this.dictionaries.intensity_analyzer;
        const affixesMod = this.dictionaries.affixes;
        const stopWordsMod = this.dictionaries.stop_words;

        const semanticConfig = {
            CONCEPT_MAP: conceptsMod?.CONCEPT_MAP || this._extract(conceptsMod)?.CONCEPT_MAP || {},
            CONCEPT_DEFINITIONS: conceptsMod?.CONCEPT_DEFINITIONS || this._extract(conceptsMod)?.CONCEPT_DEFINITIONS || {},
            AFFIX_DICTIONARY: affixesMod?.AFFIX_DICTIONARY || this._extract(affixesMod) || {},
            STOP_WORDS_SET: stopWordsMod?.STOP_WORDS_SET || this._extract(stopWordsMod) || new Set()
        };

        const emotionConfig = {
            EMOTIONAL_ANCHORS: anchorsMod?.EMOTIONAL_DICTIONARY || this._extract(anchorsMod)?.EMOTIONAL_DICTIONARY || {},
            INTENSITY_ANALYZER: intensityMod?.HIERARCHICAL_MODIFIERS || this._extract(intensityMod)?.HIERARCHICAL_MODIFIERS || {},
            AFFIX_DICTIONARY: semanticConfig.AFFIX_DICTIONARY
        };

        // التحقق من صحة البيانات قبل التشغيل
        if (Object.keys(semanticConfig.CONCEPT_MAP).length === 0) {
            console.warn("⚠️ [Warning] CONCEPT_MAP is empty. Semantic analysis might fail.");
        }

        // =========================================================
        // ⚙️ تسجيل المحركات وربطها بالبيانات والدوال
        // =========================================================
        console.log("%c⚙️ [Registry] Finalizing Engine Connections...", "color:#673AB7; font-weight:bold;");

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

        // هنا نمرر القاموس "كاملاً" لضمان وصول دوال البحث (Logic)
        this.engines.synthesis = new SynthesisEngine({
            PATTERNS: this._extract(this.dictionaries.psychological_patterns_hyperreal),
            BEHAVIOR_VALUES: this._extract(this.dictionaries.behavior_values_defenses)
        });

        this.engines.reasoning = new ReasoningEngine(this.memory);
        this.engines.knowledge = new KnowledgeEngine();

        this.engines.catharsis = new CatharsisEngine(
            {
                GENERATIVE_ENGINE: this._extract(this.dictionaries.generative_responses_engine),
                EMOTIONAL_DYNAMICS: this._extract(this.dictionaries.emotional_dynamics_engine),
                PATTERNS: this._extract(this.dictionaries.psychological_patterns_hyperreal)
            },
            {},
            this.memory
        );

        console.log("%c✅ [Brain] All Systems Calibrated & Online", "color:#4CAF50; font-weight:bold;");

        this._isInitialized = true;
        return this;
    }

    // =========================================================
    // 🌌 دورة حياة التحليل (The Pipeline)
    // =========================================================
    async analyze(rawText, context = {}) {
        if (!this._isInitialized) {
            console.error("❌ Brain is not initialized. Call init() first.");
            return null;
        }

        const workspace = new UnifiedWorkspace(rawText);

        try {
            console.log(`\n%c🌌 [Workspace] New Field Energy Detected: "${rawText}"`, "color:#607D8B; font-weight:bold;");

            // 1. القراءة وتوزيع الانتباه
            await this.engines.reader.ingest(workspace);
            await this.engines.attention.process(workspace);
            
            // 2. دمج الحالة الحالية بالماضي
            await this.engines.synthesizer.synthesize(workspace, this.memory?.workingMemory || []);

            console.log("%c⚡ [Process] Activating Cognitive Engines...", "color:#FF9800;");

            // 3. تحليل العاطفة والمعنى (بشكل متوازي للسرعة)
            await Promise.all([
                this.engines.semantic.analyze(workspace, context),
                this.engines.emotion.analyze(workspace, context)
            ]);

            // 4. دمج الخيوط واتخاذ القرار الاستراتيجي
            await this.engines.synthesis.analyze(workspace, context);
            await this.engines.reasoning.computeStrategicInsight(workspace);

            // 5. استشارة المراجع العلمية
            workspace.clinicalInsights = await this.engines.knowledge.consultLibrary(workspace);

            // طباعة التقرير النهائي للمجال المعرفي
            workspace.generateFieldReport();

            console.log("%c✔ [Success] Full Context Synthesized", "color:#4CAF50; font-weight:bold;");

            return workspace;

        } catch (e) {
            console.error("🚨 [Pipeline Failure]:", e);
            return null;
        }
    }

    async generateResponse(workspace) {
        try {
            console.log("%c💬 [Response] Orchestrating Catharsis...", "color:#9C27B0; font-weight:bold;");

            const response = await this.engines.catharsis.generateResponse(workspace);

            console.log(`🎯 [Final Intent]: %c${workspace.state.finalIntent || "neutral_support"}`, "color:#E91E63; font-weight:bold;");
            console.log(`🧬 [Style DNA]: %c${response.emotionalDNA?.name || "dynamic"}`, "color:#2196F3;");

            return response;

        } catch (e) {
            console.error("❌ Response Generation Error:", e);
            return { responseText: "أنا سامعك وحاسس بيك.. كمل كلامك، أنا معاك." };
        }
    }

    async process(rawText, context = {}) {
        const workspace = await this.analyze(rawText, context);
        if (!workspace) {
            return {
                insight: null,
                response: { responseText: "عذراً، حصل خطأ داخلي في معالجة البيانات." }
            };
        }

        const response = await this.generateResponse(workspace);
        return { insight: workspace, response };
    }
}

export default LinguisticBrain;
