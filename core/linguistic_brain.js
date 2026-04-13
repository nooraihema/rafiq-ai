
// /core/linguistic_brain_v4.js
// LinguisticBrain v4.0 - Full Joy & Hyper-Logging Edition
// ============================================================

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
  manualProtocols: null 
};

export class LinguisticBrain {

constructor(memorySystem, opts = {}) {
    console.log("%c🧠 [Constructor] Creating LinguisticBrain instance...", "color: #2196F3; font-weight: bold;");
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

    console.log("%c=======================================", "color: #4CAF50");
    console.log("%c🧠 Brain Initialization Started", "color: #4CAF50; font-weight: bold; font-size: 1.2em;");
    console.log("%c=======================================", "color: #4CAF50");

    // --- الخطوة 1: تحميل القواميس ---
    console.log("%c[Step 1] 📥 Loading Dictionaries...", "color: #FF9800; font-weight: bold;");
    const dictFileNames = this.options.dictionaryFileNames;
    const promises = Object.entries(dictFileNames).map(async ([key, fileName]) => {
        try {
            const mod = await import(`../dictionaries/${fileName}`);
            this.dictionaries[key] = mod.default || mod;
            console.log(`   ✅ Loaded: %c${key}`, "color: #8BC34A; font-weight: bold;");
        } catch (e) {
            console.error(`   ❌ CRITICAL: Failed to load dictionary [${key}]`, e);
        }
    });
    await Promise.all(promises);

    // --- الخطوة 2: تحميل البروتوكولات ---
    console.log("%c[Step 2] 🛡️ Loading Protocols...", "color: #FF9800; font-weight: bold;");
    const protocolsToUse = manualProtocols || this.options.manualProtocols;
    if (protocolsToUse) {
        this.protocols = protocolsToUse;
        console.log("   ✅ Protocols assigned manually.");
    } else {
        try {
            const protoMod = await import(`../protocols/depression_gateway_ultra_rich.js`);
            const protocol = protoMod.default || protoMod;
            if (protocol && protocol.tag) {
                this.protocols[protocol.tag] = protocol;
                console.log(`   ✅ Protocol Active: %c${protocol.tag}`, "color: #E91E63; font-weight: bold;");
            }
        } catch (e) {
            console.warn("   ⚠️ Protocols directory not accessible, starting with empty protocols.");
            this.protocols = {}; 
        }
    }

    // --- الخطوة 3: تجهيز إعدادات المحركات ---
    console.log("%c[Step 3] 🏗️ Mapping Config to Engines...", "color: #FF9800; font-weight: bold;");
    
    const semanticConfig = {
        CONCEPT_MAP: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP || {},
        CONCEPT_DEFINITIONS: this.dictionaries.psychological_concepts_engine?.CONCEPT_DEFINITIONS || {},
        AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY || this.dictionaries.affixes || {},
        STOP_WORDS_SET: this.dictionaries.stop_words?.STOP_WORDS_SET || this.dictionaries.stop_words || new Set()
    };
    console.log(`   - Semantic Config: %c${Object.keys(semanticConfig.CONCEPT_MAP).length} concepts mapped.`, "color: #00BCD4;");

    // --- الخطوة 4: إنشاء المحركات ---
    console.log("%c[Step 4] ⚙️ Instantiating Engines...", "color: #FF9800; font-weight: bold;");

    try {
        console.log("   🧠 Initializing: SemanticEngine...");
        this.engines.semantic = new SemanticEngine(semanticConfig);

        console.log("   💓 Initializing: EmotionEngine...");
        this.engines.emotion = new EmotionEngine({
            EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors || {},
            INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer || {},
            AFFIX_DICTIONARY: semanticConfig.AFFIX_DICTIONARY // ربط الزوائد بمحرك المشاعر أيضاً
        });

        console.log("   🧬 Initializing: SynthesisEngine...");
        this.engines.synthesis = new SynthesisEngine({
            PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {},
            BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses || {}
        });

        console.log("   💬 Initializing: CatharsisEngine...");
        this.engines.catharsis = new CatharsisEngine(
            { 
                GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine || {},
                EMOTIONAL_DYNAMICS: this.dictionaries.emotional_dynamics_engine || {} 
            },
            this.protocols,
            this.memory
        );

        console.log("%c   🎉 ALL ENGINES ARE ONLINE & READY", "color: #4CAF50; font-weight: bold;");
    } catch (e) {
        console.error("   ❌ Engine Initialization Failed:", e);
        throw e;
    }

    this._isInitialized = true;
    return this;
}

async analyze(rawText, context = {}) {
    if (!this._isInitialized) {
        console.error("❌ Brain not initialized! Call init() first.");
        return null;
    }

    console.log("\n" + "%c🚀 Starting Analysis Pipeline".repeat(1), "color: #ffffff; background: #2196F3; padding: 5px; font-weight: bold;");
    console.log(`%c[Input]: "${rawText}"`, "color: #FFEB3B; font-weight: bold;");

    const start = Date.now();

    try {
        // 1. تحليل المفاهيم
        console.log("%c[Pipeline 1] Running Semantic Analysis...", "color: #9C27B0; font-weight: bold;");
        const semanticMap = await this.engines.semantic.analyze(rawText, context);
        console.log(`   📊 Concepts Found: %c${Object.keys(semanticMap.concepts || {}).length}`, "color: #00BCD4; font-weight: bold;");

        // 2. تحليل المشاعر
        console.log("%c[Pipeline 2] Running Emotion Analysis...", "color: #9C27B0; font-weight: bold;");
        const emotionProfile = await this.engines.emotion.analyze(rawText, context);
        console.log(`   💓 Primary Emotion: %c${emotionProfile.primaryEmotion?.name || 'neutral'}`, "color: #E91E63; font-weight: bold;");
        console.log(`   📈 Intensity Score: %c${emotionProfile.intensity?.overall || 0}`, "color: #E91E63; font-weight: bold;");

        // 3. التركيب (Synthesis)
        console.log("%c[Pipeline 3] Running Synthesis (Connecting the dots)...", "color: #9C27B0; font-weight: bold;");
        const synthesisProfile = await this.engines.synthesis.analyze({
            semanticMap,
            emotionProfile
        });
        
        if (synthesisProfile.dominantPattern) {
            console.log(`   🧬 Pattern Detected: %c${synthesisProfile.dominantPattern.pattern_id}`, "color: #FFC107; font-weight: bold;");
        } else {
            console.log("   🧬 No specific psychological pattern detected.");
        }

        const duration = Date.now() - start;
        console.log(`%c⏱ Analysis Time: ${duration}ms`, "color: #757575; font-style: italic;");

        return {
            rawText,
            timestamp: new Date().toISOString(),
            semanticMap,
            emotionProfile,
            synthesisProfile,
            _meta: { durationMs: duration }
        };

    } catch (error) {
        console.error("❌ CRITICAL ERROR in analyze():", error);
        return null;
    }
}

async generateResponse(insight) {
    if (!this._isInitialized || !insight) return null;

    try {
        console.log("%c[Pipeline 4] Generating Soulful Response...", "color: #9C27B0; font-weight: bold;");
        const response = await this.engines.catharsis.generateResponse(insight);
        
        console.log("%c💬 Reply Logic Finalized.", "color: #4CAF50; font-weight: bold;");
        console.log(`🎯 Intent: %c${response.intent || 'insight_delivery'}`, "color: #FF5722; font-weight: bold;");
        console.log(`🧬 DNA Mix: %c${response.emotionalDNA?.join(', ') || 'standard'}`, "color: #FF5722; font-weight: bold;");
        
        return response;
    } catch (error) {
        console.error("❌ Error generating response:", error);
        return { responseText: "أنا هنا معك، هل يمكنك إخباري بالمزيد؟" };
    }
}

async process(rawText, context = {}) {
    console.log("%c--- ⚙️ FULL COGNITIVE PROCESS INITIATED ---", "color: #607D8B; font-weight: bold;");
    
    // تنفيذ التحليل
    const insight = await this.analyze(rawText, context);
    if (!insight) return { insight: null, response: { responseText: "عذراً، حدث خطأ تقني في المعالجة." } };

    // تنفيذ التوليد
    const response = await this.generateResponse(insight);
    
    console.log("%c✅ PROCESS FINISHED SUCCESSFULLY", "color: #4CAF50; font-weight: bold;");
    console.log("=".repeat(40));
    
    return { insight, response };
}

}

export default LinguisticBrain;
