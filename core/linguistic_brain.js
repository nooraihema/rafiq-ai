
// /core/linguistic_brain.js - Browser Version v3.0
// تم تعديله ليعمل داخل المتصفح (الهاتف) مباشرة بدلاً من السيرفر

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import { SynthesisEngine } from '../analysis_engines/synthesis_engine.js';
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';

// ملاحظة: تم حذف import path و fs لأنها لا تعمل في المتصفح

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
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.protocols = {};
        this.engines = { semantic: null, emotion: null, synthesis: null, catharsis: null };
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log('[Brain.init] Step 1: Starting new dictionary loading (Browser Mode)...');
        const dictFileNames = this.options.dictionaryFileNames;
        
        // تحميل القواميس باستخدام استدعاءات المتصفح النسبية
        const promises = Object.entries(dictFileNames).map(async ([key, fileName]) => {
            try {
                // المتصفح يحتاج مسار نسبي يبدأ بـ ../
                const mod = await import(`../dictionaries/${fileName}`);
                this.dictionaries[key] = mod.default || mod;
                if (this.options.debug) console.log(`  ✅ Successfully loaded dictionary: '${key}'`);
            } catch (e) {
                console.error(`  ❌ CRITICAL: Failed to load dictionary '${key}'`, e);
                this.dictionaries[key] = null;
            }
        });
        
        await Promise.all(promises);
        console.log('[Brain.init] Step 1: Dictionary loading finished.');

        // تحميل البروتوكولات (في المتصفح لا يمكننا مسح المجلد تلقائياً، لذا سنستدعي البروتوكول الأساسي يدوياً)
        console.log('[Brain.init] Loading Protocols...');
        try {
            // سنحاول تحميل البروتوكول الذي رأيناه في سجلاتك السابقة
            const protoMod = await import(`../protocols/depression_gateway_ultra_rich.js`);
            const protocol = protoMod.default || protoMod;
            if (protocol && protocol.tag) {
                this.protocols[protocol.tag] = protocol;
                console.log(`  ✅ Successfully loaded protocol: '${protocol.tag}'`);
            }
        } catch (e) {
            console.warn(`⚠️ Could not load specific protocol file. If you have others, they need to be imported manually in Browser Mode.`);
        }

        console.log('\n[Brain.init] Step 2: Validating required dictionaries...');
        const requiredForSemantic = {
            CONCEPT_MAP: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP,
            AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY,
            STOP_WORDS_SET: this.dictionaries.stop_words,
            EMOTIONAL_ANCHORS_DICTIONARY: this.dictionaries.emotional_anchors?.EMOTIONAL_DICTIONARY,
            CONCEPT_DEFINITIONS: this.dictionaries.psychological_concepts_engine?.CONCEPT_DEFINITIONS
        };

        for (const [key, value] of Object.entries(requiredForSemantic)) {
            if (!value) {
                throw new Error(`Initialization failed: SemanticEngine is missing required part '${key}'.`);
            }
            if (this.options.debug) console.log(`  ✅ Validation passed for SemanticEngine requirement: '${key}'`);
        }

        console.log('\n[Brain.init] Step 3: Instantiating analysis engines...');
        try {
            this.engines.semantic = new SemanticEngine(requiredForSemantic);
            this.engines.emotion = new EmotionEngine({
                EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors,
                INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer
            });
            this.engines.synthesis = new SynthesisEngine({
                PATTERNS: this.dictionaries.psychological_patterns_hyperreal,
                BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses
            });
            this.engines.catharsis = new CatharsisEngine(
                { GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine },
                this.protocols,
                this.memory
            );

            if (this.options.debug) console.log("  ✅ All Engines instantiated.");
        } catch(e) {
            console.error("  ❌ CRITICAL: Error during engine instantiation.", e);
            throw e;
        }

        this._isInitialized = true;
        console.log(`\n🎉 LinguisticBrain initialized successfully in Browser!`);
        return this;
    }

    async analyze(rawText, context = {}) {
        if (!this._isInitialized) {
            console.error("LinguisticBrain is not initialized.");
            return null;
        }

        const start = Date.now();
        if (this.options.debug) console.log('\n[Brain.analyze] Starting analysis pipeline...');
        
        const semanticMap = this.engines.semantic.analyze(rawText);
        const emotionProfile = this.engines.emotion.analyze(rawText, {
            previousEmotion: context.previousEmotion || null
        });
        const synthesisProfile = this.engines.synthesis.analyze({
            semanticMap: semanticMap,
            emotionProfile: emotionProfile
        });

        return {
            rawText,
            timestamp: new Date().toISOString(),
            semanticMap,
            emotionProfile,
            synthesisProfile,
            _meta: { durationMs: Date.now() - start }
        };
    }

    async generateResponse(comprehensiveInsight) {
        if (!this._isInitialized) return null;
        if (!comprehensiveInsight) {
            return this.engines.catharsis.generateResponse({
                rawText: "",
                semanticMap: { conceptInsights: {} },
                emotionProfile: { primaryEmotion: { name: 'neutral', score: 1 } },
                synthesisProfile: { cognitiveHypotheses: [] }
            });
        }
        return this.engines.catharsis.generateResponse(comprehensiveInsight);
    }

    async process(rawText, context = {}) {
        const insight = await this.analyze(rawText, context);
        if (!insight) return null;
        const response = await this.generateResponse(insight);
        return { insight, response };
    }
}

export default LinguisticBrain;
