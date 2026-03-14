
// /core/linguistic_brain.js - Browser Version v3.1
// تم التعديل لإصلاح مشكلة توقف التحليل وتفعيل سجلات التتبع

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
// تأكد من تطابق المسميات في الملفات الأخرى مع هذه الاستيرادات
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
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.protocols = {};
        this.engines = { semantic: null, emotion: null, synthesis: null, catharsis: null };
        this._isInitialized = false;
    }

    async init(manualProtocols = null) {
        if (this._isInitialized) return this;

        console.log('[Brain.init] Step 1: Starting dictionary loading...');
        const dictFileNames = this.options.dictionaryFileNames;
        
        const promises = Object.entries(dictFileNames).map(async ([key, fileName]) => {
            try {
                const mod = await import(`../dictionaries/${fileName}`);
                this.dictionaries[key] = mod.default || mod;
                if (this.options.debug) console.log(`  ✅ Loaded dictionary: '${key}'`);
            } catch (e) {
                console.error(`  ❌ Failed to load dictionary '${key}'`, e);
            }
        });
        
        await Promise.all(promises);

        // حل مشكلة البروتوكولات: إذا تم تمريرها يدوياً أو تحميل الافتراضي
        console.log('[Brain.init] Step 2: Loading Protocols...');
        if (manualProtocols) {
            this.protocols = manualProtocols;
            console.log('  ✅ Protocols loaded manually.');
        } else {
            try {
                const protoMod = await import(`../protocols/depression_gateway_ultra_rich.js`);
                const protocol = protoMod.default || protoMod;
                if (protocol && protocol.tag) {
                    this.protocols[protocol.tag] = protocol;
                    console.log(`  ✅ Loaded protocol: '${protocol.tag}'`);
                }
            } catch (e) {
                console.warn(`⚠️ Protocols directory not accessible. Using empty protocols.`);
            }
        }

        console.log('[Brain.init] Step 3: Validating requirements...');
        const requiredForSemantic = {
            CONCEPT_MAP: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP,
            AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY,
            STOP_WORDS_SET: this.dictionaries.stop_words,
            EMOTIONAL_ANCHORS_DICTIONARY: this.dictionaries.emotional_anchors?.EMOTIONAL_DICTIONARY || this.dictionaries.emotional_anchors,
            CONCEPT_DEFINITIONS: this.dictionaries.psychological_concepts_engine?.CONCEPT_DEFINITIONS
        };

        console.log('[Brain.init] Step 4: Instantiating engines...');
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
            console.log("  ✅ All Engines ready.");
        } catch(e) {
            console.error("  ❌ Engine Instantiation Error:", e);
            throw e;
        }

        this._isInitialized = true;
        return this;
    }

    async analyze(rawText, context = {}) {
        if (!this._isInitialized) return null;
        const start = Date.now();

        try {
            // 1. التحليل الدلالي
            if (this.options.debug) console.log('[Pipeline] 1. Running SemanticEngine...');
            const semanticMap = this.engines.semantic.analyze(rawText);
            if (this.options.debug) console.log('   Captured Concepts:', Object.keys(semanticMap.concepts || {}));

            // 2. تحليل المشاعر
            if (this.options.debug) console.log('[Pipeline] 2. Running EmotionEngine...');
            const emotionProfile = this.engines.emotion.analyze(rawText, {
                previousEmotion: context.previousEmotion || null
            });
            if (this.options.debug) console.log('   Primary Emotion:', emotionProfile.primaryEmotion?.name);

            // 3. التركيب النفسي
            if (this.options.debug) console.log('[Pipeline] 3. Running SynthesisEngine...');
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
        } catch (error) {
            console.error("❌ Critical Error in analysis pipeline:", error);
            return null; // سيمنع الـ process من الاستمرار في حالة الخطأ
        }
    }

    async generateResponse(comprehensiveInsight) {
        if (!this._isInitialized || !comprehensiveInsight) return null;
        
        try {
            if (this.options.debug) console.log('[Pipeline] 4. Generating Response via CatharsisEngine...');
            return await this.engines.catharsis.generateResponse(comprehensiveInsight);
        } catch (error) {
            console.error("❌ Error generating response:", error);
            return { responseText: "أنا هنا معك، هل يمكنك إخباري بالمزيد؟" };
        }
    }

    async process(rawText, context = {}) {
        const insight = await this.analyze(rawText, context);
        if (!insight) {
            return { 
                insight: null, 
                response: { responseText: "عذراً، حدث خطأ داخلي في معالجة البيانات." } 
            };
        }

        const response = await this.generateResponse(insight);
        
        // طباعة النتيجة النهائية في الـ Log لرؤية التحليل الكامل
        console.log("=== [Final Analysis Result] ===");
        console.dir({ insight, response }, { depth: null });

        return { insight, response };
    }
}

export default LinguisticBrain;
