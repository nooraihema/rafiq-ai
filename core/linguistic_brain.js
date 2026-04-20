
// /core/linguistic_brain_v4.js
// LinguisticBrain v9.1 - Unified Cognitive Workspace + Decision Layer + Clean Logs

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
        console.log("%c🧠 Brain init v9.1", "color:#2196F3;font-weight:bold;");
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.engines = {};
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log("%c🧠 Brain Booting...", "color:#4CAF50;font-weight:bold;");

        const dictFileNames = this.options.dictionaryFileNames;

        await Promise.all(Object.entries(dictFileNames).map(async ([key, fileName]) => {
            try {
                const mod = await import(`../dictionaries/${fileName}`);
                this.dictionaries[key] = mod;
                console.log(`   ✅ Asset Loaded: ${key}`);
            } catch (e) {
                console.log(`   ❌ Missing Asset: ${key}`);
            }
        }));

        const semanticConfig = {
            CONCEPT_MAP: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP || {},
            CONCEPT_DEFINITIONS: this.dictionaries.psychological_concepts_engine?.CONCEPT_DEFINITIONS || {},
            AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY || {},
            STOP_WORDS_SET: this.dictionaries.stop_words?.STOP_WORDS_SET || new Set()
        };

        const emotionConfig = {
            EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors?.EMOTIONAL_DICTIONARY || {},
            INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer || {},
            AFFIX_DICTIONARY: semanticConfig.AFFIX_DICTIONARY
        };

        console.log("%c⚙️ Engines Loading...", "color:#673AB7;font-weight:bold;");

        this.engines.reader = new HighFidelityReader(semanticConfig);
        this.engines.attention = new AttentionLayer(semanticConfig);
        this.engines.synthesizer = new StateSynthesizer();

        this.engines.semantic = new SemanticEngine(semanticConfig);
        this.engines.emotion = new EmotionEngine(emotionConfig);

        this.engines.synthesis = new SynthesisEngine({});
        this.engines.reasoning = new ReasoningEngine(this.memory);
        this.engines.knowledge = new KnowledgeEngine();

        this.engines.catharsis = new CatharsisEngine({}, {}, this.memory);

        console.log("%c✅ Engines Online", "color:#4CAF50;font-weight:bold;");

        this._isInitialized = true;
        return this;
    }

    // =========================================================
    // 🔥 DECISION LAYER (NEW)
    // =========================================================
    _refineDecision(workspace) {
        const semantic = workspace.semantic || {};
        const emotion = workspace.emotion || {};
        const state = workspace.state || {};

        const v = emotion?.stateModel?.v ?? 0;
        const intensity = emotion?.intensity?.overall ?? 0.3;

        let finalMood = "neutral";

        if (v < -0.5) finalMood = "negative";
        if (v < -0.7) finalMood = "clinical_depression";
        if (v > 0.4) finalMood = "positive";

        if (state.dominantConcept === "sadness") {
            finalMood = "sadness";
        }

        let finalIntent = "EMPATHETIC_LISTENING";

        if (finalMood === "positive") {
            finalIntent = "REINFORCEMENT";
        }

        if (finalMood === "clinical_depression") {
            finalIntent = "EMPATHETIC_LISTENING";
        }

        workspace.state.finalMood = finalMood;
        workspace.state.finalIntent = finalIntent;
        workspace.state.confidence = Math.min(1, intensity + 0.3);
    }

    // =========================================================
    // ANALYSIS PIPELINE
    // =========================================================
    async analyze(rawText, context = {}) {
        if (!this._isInitialized) return null;

        const workspace = new UnifiedWorkspace(rawText);

        try {
            console.log("\n%c🌌 Workspace Started", "color:#607D8B;font-weight:bold;");

            await this.engines.reader.ingest(workspace);
            console.log("📦 Reader Done");

            await this.engines.attention.process(workspace);
            console.log("🎯 Attention Done");

            await this.engines.synthesizer.synthesize(workspace, this.memory?.workingMemory || []);
            console.log("🧠 Synth Done");

            console.log("⚡ Running Cognitive Engines...");

            await Promise.all([
                this.engines.semantic.analyze(workspace, context),
                this.engines.emotion.analyze(workspace, context)
            ]);

            console.log("🔬 Semantic + Emotion Done");

            await this.engines.synthesis.analyze(workspace, context);
            await this.engines.reasoning.computeStrategicInsight(workspace);

            console.log("🧩 Reasoning Done");

            this._refineDecision(workspace);

            workspace.clinicalInsights =
                await this.engines.knowledge.consultLibrary(workspace);

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

            // 🔥 FINAL ONLY LOGS
            console.log("🎯 FINAL INTENT:", workspace.state.finalIntent);
            console.log("🧬 FINAL MOOD:", workspace.state.finalMood);
            console.log("⚖️ CONFIDENCE:", workspace.state.confidence);

            return response;

        } catch (e) {
            console.error("❌ Response Error:", e);
            return { responseText: "أنا معاك." };
        }
    }

    async process(rawText, context = {}) {
        const workspace = await this.analyze(rawText, context);
        if (!workspace) {
            return {
                insight: null,
                response: { responseText: "Error" }
            };
        }

        const response = await this.generateResponse(workspace);
        return { insight: workspace, response };
    }
}

export default LinguisticBrain;
