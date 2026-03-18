
// /core/linguistic_brain_v4.js
// LinguisticBrain v4.0 - Full Joy Edition
// تم إضافة دعم تحميل البروتوكولات يدوياً وحفظ كل Logs

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';

// --- النسخة المحسنة: Default Options ---
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
  },
  manualProtocols: null  // ← هنا يمكن تمرير البروتوكولات يدوياً
};

export class LinguisticBrain {

constructor(memorySystem, opts = {}) {
    console.log("🧠 [Constructor] Creating LinguisticBrain instance...");
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
        console.log("⚠️ [Init] Brain already initialized.");
        return this;
    }

    console.log("=======================================");
    console.log("🧠 Brain Initialization Started");
    console.log("=======================================");

    // --- الخطوة 1: تحميل القواميس ---
    console.log("[Step 1] Loading dictionaries from files...");
    const dictFileNames = this.options.dictionaryFileNames;
    const promises = Object.entries(dictFileNames).map(async ([key, fileName]) => {
        try {
            const mod = await import(`../dictionaries/${fileName}`);
            this.dictionaries[key] = mod.default || mod;
            console.log(`  📥 ${key} loaded.`);
        } catch (e) {
            console.error(`  ❌ Failed loading: ${key}`, e);
        }
    });
    await Promise.all(promises);

    // --- الخطوة 2: تحميل البروتوكولات (مع fallback يدوية) ---
    console.log("=======================================");
    console.log("[Step 2] Loading Psychological Protocols...");

    const protocolsToUse = manualProtocols || this.options.manualProtocols;
    if (protocolsToUse) {
        this.protocols = protocolsToUse;
        console.log("  ✅ Protocols loaded manually.");
    } else {
        try {
            const protoMod = await import(`../protocols/depression_gateway_ultra_rich.js`);
            const protocol = protoMod.default || protoMod;
            if (protocol && protocol.tag) {
                this.protocols[protocol.tag] = protocol;
                console.log(`  ✅ Protocol Active: ${protocol.tag}`);
            }
        } catch (e) {
            console.warn("  ⚠️ Protocols directory not accessible, fallback to empty protocols.");
            this.protocols = {}; // ← حفاظ على عدم توقف المحركات
        }
    }

    // --- الخطوة 3: تجهيز القواميس ---
    console.log("=======================================");
    console.log("[Step 3] Mapping Dictionary Keys to Engines...");
    
    const semanticConfig = {
        CONCEPT_MAP: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP || {},
        CONCEPT_DEFINITIONS: this.dictionaries.psychological_concepts_engine?.CONCEPT_DEFINITIONS || {},
        AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY || this.dictionaries.affixes || {},
        STOP_WORDS_SET: this.dictionaries.stop_words?.STOP_WORDS_SET || this.dictionaries.stop_words || new Set()
    };
    console.log("  🔎 Semantic Maps Prepared. Items in Map:", Object.keys(semanticConfig.CONCEPT_MAP).length);

    // --- الخطوة 4: إنشاء المحركات ---
    console.log("=======================================");
    console.log("[Step 4] Instantiating Engines...");

    try {
        console.log("  🧠 SemanticEngine...");
        this.engines.semantic = new SemanticEngine(semanticConfig);

        console.log("  💓 EmotionEngine...");
        this.engines.emotion = new EmotionEngine({
            EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors || {},
            INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer || {}
        });

        console.log("  🧬 SynthesisEngine...");
        this.engines.synthesis = new SynthesisEngine({
            PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {},
            BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses || {}
        });

        console.log("  💬 CatharsisEngine...");
        this.engines.catharsis = new CatharsisEngine(
            { 
                GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine || {},
                EMOTIONAL_DYNAMICS: this.dictionaries.emotional_dynamics_engine || {} 
            },
            this.protocols,
            this.memory
        );

        console.log("  ✅ ALL ENGINES READY.");
    } catch (e) {
        console.error("  ❌ Engine Initialization Failed:", e);
        throw e;
    }

    console.log("=======================================");
    console.log("🎉 Brain Initialization Completed Successfully");
    console.log("=======================================");

    this._isInitialized = true;
    return this;
}

async analyze(rawText, context = {}) {
    if (!this._isInitialized) {
        console.warn("⚠️ Brain not initialized. Call init() first.");
        return null;
    }

    console.log("\n\n" + "=".repeat(40));
    console.log(`🧠 ANALYSIS START: "${rawText}"`);
    console.log("=".repeat(40));

    const start = Date.now();

    try {
        // 1. تحليل المفاهيم
        console.log("[Pipeline 1] Running Semantic Analysis...");
        const semanticMap = await this.engines.semantic.analyze(rawText, context);
        console.log(`  📊 Concepts Found: ${Object.keys(semanticMap.concepts || {}).length}`);

        // 2. تحليل المشاعر
        console.log("[Pipeline 2] Running Emotion Analysis...");
        const emotionProfile = await this.engines.emotion.analyze(rawText, {
            previousEmotion: context.previousEmotion || null
        });
        console.log(`  💓 Primary Emotion: ${emotionProfile.primaryEmotion?.name || 'neutral'} (${emotionProfile.intensity?.overall || 0})`);

        // 3. التركيب (Synthesis)
        console.log("[Pipeline 3] Running Synthesis (Connecting the dots)...");
        const synthesisProfile = await this.engines.synthesis.analyze({
            semanticMap,
            emotionProfile
        });
        console.log(`  🧬 Pattern Detected: ${synthesisProfile.dominantPattern?.pattern_id || "None"}`);

        const duration = Date.now() - start;
        console.log(`⏱ Total Analysis Time: ${duration}ms`);

        return {
            rawText,
            timestamp: new Date().toISOString(),
            semanticMap,
            emotionProfile,
            synthesisProfile,
            _meta: { durationMs: duration }
        };

    } catch (error) {
        console.error("❌ Critical Error in Pipeline:", error);
        return null;
    }
}

async generateResponse(comprehensiveInsight) {
    if (!this._isInitialized || !comprehensiveInsight) return null;

    try {
        console.log("[Pipeline 4] Generating Soulful Response...");
        const response = await this.engines.catharsis.generateResponse(comprehensiveInsight);
        
        console.log("💬 Reply Logic Complete.");
        console.log(`🎯 Intent: ${response.intent || 'unknown'} | DNA: ${response.emotionalDNA?.join(', ') || 'neutral'}`);
        
        return response;
    } catch (error) {
        console.error("❌ Error generating response:", error);
        return { responseText: "أنا هنا معك، هل يمكنك إخباري بالمزيد؟" };
    }
}

async process(rawText, context = {}) {
    console.log("🚀 STARTING FULL COGNITIVE PROCESS");
    const insight = await this.analyze(rawText, context);
    if (!insight) return { insight: null, response: { responseText: "عذراً، حدث خطأ." } };

    const response = await this.generateResponse(insight);
    
    console.log("✅ PROCESS FINISHED");
    return { insight, response };
}

}

export default LinguisticBrain;
