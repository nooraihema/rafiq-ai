
// /core/linguistic_brain_v4.js
// LinguisticBrain v9.0 - Unified Cognitive Workspace Edition (Clean Logs)

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
        console.log("%c🧠 [Brain] init v9.0 (Workspace Mode)", "color:#2196F3;font-weight:bold;");
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.engines = {};
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log("%c🧠 Brain Booting...", "color:#4CAF50;font-weight:bold;");

        // =========================
        // Load dictionaries (silent but tracked)
        // =========================
        const dictFileNames = this.options.dictionaryFileNames;

        await Promise.all(Object.entries(dictFileNames).map(async ([key, fileName]) => {
            try {
                const mod = await import(`../dictionaries/${fileName}`);
                this.dictionaries[key] = mod;
                console.log(`   ✅ Engine Asset: ${key}`);
            } catch (e) {
                console.log(`   ❌ Missing Asset: ${key}`);
            }
        }));

        // =========================
        // configs
        // =========================
        const semanticConfig = {
            CONCEPT_MAP: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP || {},
            CONCEPT_DEFINITIONS: this.dictionaries.psychological_concepts_engine?.CONCEPT_DEFINITIONS || {},
            AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY || this.dictionaries.affixes || {},
            STOP_WORDS_SET: this.dictionaries.stop_words?.STOP_WORDS_SET || new Set()
        };

        const emotionConfig = {
            EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors?.EMOTIONAL_DICTIONARY || this.dictionaries.emotional_anchors || {},
            INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer?.HIERARCHICAL_MODIFIERS || this.dictionaries.intensity_analyzer || {},
            AFFIX_DICTIONARY: semanticConfig.AFFIX_DICTIONARY
        };

        // =========================
        // ENGINE REGISTRY LOG (clean)
        // =========================
        console.log("%c⚙️ Initializing Engines...", "color:#673AB7;font-weight:bold;");

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

        this.engines.catharsis = new CatharsisEngine(
            {
                GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine || {},
                EMOTIONAL_DYNAMICS: this.dictionaries.emotional_dynamics_engine || {},
                PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {}
            },
            {},
            this.memory
        );

        console.log("%c✅ All Engines Online", "color:#4CAF50;font-weight:bold;");

        this._isInitialized = true;
        return this;
    }

    // =========================================================
    // ANALYSIS PIPELINE (clean logs only)
    // =========================================================
    async analyze(rawText, context = {}) {
        if (!this._isInitialized) return null;

        const workspace = new UnifiedWorkspace(rawText);

        try {
            console.log("\n%c🌌 Workspace Started", "color:#607D8B;font-weight:bold;");

            await this.engines.reader.ingest(workspace);
            await this.engines.attention.process(workspace);
            await this.engines.synthesizer.synthesize(workspace, this.memory?.workingMemory || []);

            console.log("⚡ Running Cognitive Engines...");

            await Promise.all([
                this.engines.semantic.analyze(workspace, context),
                this.engines.emotion.analyze(workspace, context)
            ]);

            await this.engines.synthesis.analyze(workspace, context);
            await this.engines.reasoning.computeStrategicInsight(workspace);

            workspace.clinicalInsights =
                await this.engines.knowledge.consultLibrary(workspace);

            // 🔥 ONLY IMPORTANT OUTPUT
            workspace.generateFieldReport();

            console.log("%c✔ Pipeline Complete", "color:#4CAF50;font-weight:bold;");

            return workspace;

        } catch (e) {
            console.error("❌ Pipeline Error:", e);
            return null;
        }
    }

    async generateResponse(workspace) {
        try {
            console.log("%c💬 Generating Response...", "color:#9C27B0;font-weight:bold;");

            const response = await this.engines.catharsis.generateResponse(workspace);

            console.log("🎯 Intent:", workspace.state.finalIntent || "unknown");
            console.log("🧬 DNA:", response.emotionalDNA?.name || "default");

            return response;

        } catch (e) {
            console.error("❌ Response Error:", e);
            return { responseText: "أنا معاك، كمل." };
        }
    }

    async process(rawText, context = {}) {
        const workspace = await this.analyze(rawText, context);
        if (!workspace) {
            return {
                insight: null,
                response: { responseText: "حصل خطأ في المعالجة." }
            };
        }

        const response = await this.generateResponse(workspace);
        return { insight: workspace, response };
    }
}

export default LinguisticBrain;
