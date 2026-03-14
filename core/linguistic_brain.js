
// /core/linguistic_brain.js
// LinguisticBrain v3.2 - Full Debug Version
// Debug Logs Added Everywhere + Dictionary Fix

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';

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

    console.log("🧠 Creating LinguisticBrain instance...");

    this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
    this.memory = memorySystem;

    this.dictionaries = {};
    this.protocols = {};

    this.engines = {
        semantic: null,
        emotion: null,
        synthesis: null,
        catharsis: null
    };

    this._isInitialized = false;

}

async init(manualProtocols = null) {

    if (this._isInitialized) {
        console.log("⚠️ Brain already initialized.");
        return this;
    }

    console.log("=======================================");
    console.log("🧠 Brain Initialization Started");
    console.log("=======================================");

    console.log("[Step 1] Loading dictionaries...");

    const dictFileNames = this.options.dictionaryFileNames;

    const promises = Object.entries(dictFileNames).map(async ([key, fileName]) => {

        try {

            console.log(`📥 Loading dictionary: ${key}`);

            const mod = await import(`../dictionaries/${fileName}`);

            this.dictionaries[key] = mod.default || mod;

            console.log(`✅ Loaded dictionary: ${key}`);

        } catch (e) {

            console.error(`❌ Failed loading dictionary: ${key}`, e);

        }

    });

    await Promise.all(promises);

    console.log("📚 All dictionaries loaded:");
    console.dir(this.dictionaries);

    console.log("=======================================");

    console.log("[Step 2] Loading Protocols...");

    if (manualProtocols) {

        this.protocols = manualProtocols;
        console.log("✅ Protocols loaded manually.");

    } else {

        try {

            const protoMod = await import(`../protocols/depression_gateway_ultra_rich.js`);

            const protocol = protoMod.default || protoMod;

            if (protocol && protocol.tag) {

                this.protocols[protocol.tag] = protocol;

                console.log(`✅ Protocol Loaded: ${protocol.tag}`);

            }

        } catch (e) {

            console.warn("⚠️ Protocols directory not accessible.");

        }

    }

    console.log("=======================================");

    console.log("[Step 3] Preparing SemanticEngine dictionaries...");

    const requiredForSemantic = {

        // FIXED VERSION
        CONCEPT_MAP: this.dictionaries.psychological_concepts_engine,
        CONCEPT_DEFINITIONS: this.dictionaries.psychological_concepts_engine,

        AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY || this.dictionaries.affixes,

        STOP_WORDS_SET: this.dictionaries.stop_words

    };

    console.log("🔎 SemanticEngine dictionaries:");
    console.dir(requiredForSemantic);

    console.log("=======================================");

    console.log("[Step 4] Creating Engines...");

    try {

        console.log("🧠 Creating SemanticEngine...");

        this.engines.semantic = new SemanticEngine(requiredForSemantic);

        console.log("💓 Creating EmotionEngine...");

        this.engines.emotion = new EmotionEngine({

            EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors,
            INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer

        });

        console.log("🧬 Creating SynthesisEngine...");

        this.engines.synthesis = new SynthesisEngine({

            PATTERNS: this.dictionaries.psychological_patterns_hyperreal,
            BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses

        });

        console.log("💬 Creating CatharsisEngine...");

        this.engines.catharsis = new CatharsisEngine(

            { GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine },

            this.protocols,

            this.memory

        );

        console.log("✅ All Engines Successfully Initialized");

    } catch (e) {

        console.error("❌ Engine Initialization Failed:", e);
        throw e;

    }

    console.log("=======================================");
    console.log("🎉 Brain Initialization Completed");
    console.log("=======================================");

    this._isInitialized = true;

    return this;

}

async analyze(rawText, context = {}) {

    if (!this._isInitialized) {

        console.warn("⚠️ Brain not initialized.");
        return null;

    }

    console.log("=======================================");
    console.log("🧠 Starting Analysis Pipeline");
    console.log("Text:", rawText);

    const start = Date.now();

    try {

        console.log("[Pipeline 1] Semantic Analysis");

        const semanticMap = this.engines.semantic.analyze(rawText, context);

        console.log("📊 Semantic Result:");
        console.dir(semanticMap);

        console.log("[Pipeline 2] Emotion Analysis");

        const emotionProfile = this.engines.emotion.analyze(rawText, {

            previousEmotion: context.previousEmotion || null

        });

        console.log("💓 Emotion Result:");
        console.dir(emotionProfile);

        console.log("[Pipeline 3] Synthesis");

        const synthesisProfile = this.engines.synthesis.analyze({

            semanticMap,
            emotionProfile

        });

        console.log("🧬 Synthesis Result:");
        console.dir(synthesisProfile);

        const duration = Date.now() - start;

        console.log(`⏱ Analysis Completed in ${duration}ms`);

        return {

            rawText,

            timestamp: new Date().toISOString(),

            semanticMap,

            emotionProfile,

            synthesisProfile,

            _meta: {

                durationMs: duration

            }

        };

    } catch (error) {

        console.error("❌ Critical Error in analysis pipeline:", error);

        return null;

    }

}

async generateResponse(comprehensiveInsight) {

    if (!this._isInitialized || !comprehensiveInsight) {

        console.warn("⚠️ Cannot generate response.");

        return null;

    }

    try {

        console.log("[Pipeline 4] Generating Response");

        const response = await this.engines.catharsis.generateResponse(comprehensiveInsight);

        console.log("💬 Generated Response:");
        console.dir(response);

        return response;

    } catch (error) {

        console.error("❌ Error generating response:", error);

        return {

            responseText: "أنا هنا معك، هل يمكنك إخباري بالمزيد؟"

        };

    }

}

async process(rawText, context = {}) {

    console.log("=======================================");
    console.log("🚀 PROCESS STARTED");
    console.log("=======================================");

    const insight = await this.analyze(rawText, context);

    if (!insight) {

        return {

            insight: null,

            response: {

                responseText: "عذراً، حدث خطأ داخلي في معالجة البيانات."

            }

        };

    }

    const response = await this.generateResponse(insight);

    console.log("=======================================");
    console.log("📊 FINAL RESULT");
    console.log("=======================================");

    console.dir({

        insight,

        response

    }, { depth: null });

    return {

        insight,

        response

    };

}

}

export default LinguisticBrain;
