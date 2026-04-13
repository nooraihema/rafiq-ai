
// /core/linguistic_brain_v4.js
// LinguisticBrain v6.0 - Full Strategic Reasoning Edition
// ============================================================

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';
import { AttentionLayer } from './attention_layer.js';
import { ReasoningEngine } from './reasoning_engine.js'; // استيراد محرك الاستدلال

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
    console.log("%c🧠 [Constructor] Creating LinguisticBrain v6.0 (Strategic)...", "color: #2196F3; font-weight: bold;");
    this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
    this.memory = memorySystem;
    this.dictionaries = {};
    this.engines = {};
    this._isInitialized = false;
}

async init(manualProtocols = null) {
    if (this._isInitialized) return this;

    console.log("%c=======================================", "color: #4CAF50");
    console.log("%c🧠 Brain Initialization Started (Version 6.0)", "color: #4CAF50; font-weight: bold;");
    console.log("%c=======================================", "color: #4CAF50");

    // --- الخطوة 1: تحميل القواميس ---
    const dictFileNames = this.options.dictionaryFileNames;
    const promises = Object.entries(dictFileNames).map(async ([key, fileName]) => {
        try {
            const mod = await import(`../dictionaries/${fileName}`);
            this.dictionaries[key] = mod.default || mod;
            console.log(`   ✅ Loaded: ${key}`);
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

    // --- الخطوة 3: بناء المحركات بالترتيب الهرمي الجديد ---
    try {
        // 1. بوابة الانتباه
        this.engines.attention = new AttentionLayer({
            anchors: this.dictionaries.emotional_anchors?.EMOTIONAL_DICTIONARY || this.dictionaries.emotional_anchors,
            concepts: semanticConfig.CONCEPT_MAP,
            stopWords: semanticConfig.STOP_WORDS_SET
        });

        // 2. محركات التحليل الأساسي
        this.engines.semantic = new SemanticEngine(semanticConfig);
        this.engines.emotion = new EmotionEngine({
            EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors || {},
            INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer || {},
            AFFIX_DICTIONARY: semanticConfig.AFFIX_DICTIONARY
        });

        // 3. محرك التركيب النفسي
        this.engines.synthesis = new SynthesisEngine({
            PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {},
            BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses || {}
        });

        // 4. المحرك الاستراتيجي (Reasoning Hub)
        this.engines.reasoning = new ReasoningEngine(this.memory);

        // 5. محرك الرد (Catharsis)
        this.engines.catharsis = new CatharsisEngine(
            { 
                GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine || {},
                EMOTIONAL_DYNAMICS: this.dictionaries.emotional_dynamics_engine || {},
                PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {}
            },
            {},
            this.memory
        );

        console.log("%c   🎉 FULL STRATEGIC PIPELINE IS ONLINE", "color: #4CAF50; font-weight: bold;");
    } catch (e) {
        console.error("❌ Brain Initialization Failed:", e);
        throw e;
    }

    this._isInitialized = true;
    return this;
}

/**
 * البايبلاين المطور: (Attention -> Analysis -> Synthesis -> Reasoning)
 */
async analyze(rawText, context = {}) {
    if (!this._isInitialized) return null;
    
    console.log("\n" + "%c🚀 Starting Cognitive Pipeline (v6.0)".repeat(1), "color: #fff; background: #2196F3; padding: 3px;");
    const start = Date.now();

    try {
        const normalized = normalizeArabic(rawText.toLowerCase());
        const tokens = tokenize(normalized);

        // [Phase 0]: التركيز (Attention)
        const attentionResult = await this.engines.attention.process(tokens);
        const attentionMap = attentionResult.salienceMap;

        // [Phase 1]: التحليل الدلالي والعاطفي (بالموازاة)
        const [semanticMap, emotionProfile] = await Promise.all([
            this.engines.semantic.analyze(rawText, { ...context, attentionMap }),
            this.engines.emotion.analyze(rawText, { ...context, attentionMap })
        ]);

        // [Phase 2]: التركيب (Synthesis)
        const synthesisProfile = await this.engines.synthesis.analyze({ semanticMap, emotionProfile });

        // [Phase 3]: الاستدلال واتخاذ القرار (Reasoning) - الميزة الجديدة
        const strategicInsight = await this.engines.reasoning.computeStrategicInsight({
            emotionProfile,
            semanticMap,
            attentionMap,
            synthesisProfile
        });

        return { 
            rawText, 
            semanticMap, 
            emotionProfile, 
            synthesisProfile, 
            strategicInsight, // الخلاصة الاستراتيجية
            attentionMap,
            _meta: { duration: Date.now() - start, focus: attentionResult.focusToken } 
        };
    } catch (error) {
        console.error("❌ Critical Analysis Error:", error);
        return null;
    }
}

async generateResponse(insight) {
    if (!this._isInitialized || !insight) return null;

    try {
        console.log("%c[Pipeline 4] Engineering Soulful Response...", "color: #9C27B0; font-weight: bold;");
        
        // CatharsisEngine الآن يستخدم insight الذي يحتوي على strategicInsight لاتخاذ قراره
        const response = await this.engines.catharsis.generateResponse(insight);
        
        console.log("%c💬 Strategic Reply Orchestrated.", "color: #4CAF50; font-weight: bold;");
        
        const dnaName = response.emotionalDNA?.name || "standard";
        console.log(`🎯 Master Intent: %c${insight.strategicInsight.masterIntent.type}`, "color: #FF5722; font-weight: bold;");
        console.log(`🧬 DNA Mix: %c${dnaName}`, "color: #FF5722; font-weight: bold;");
        
        return response;
    } catch (error) {
        console.error("❌ Response Generation Error:", error);
        return { responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك أنا سامعك." };
    }
}

async process(rawText, context = {}) {
    const insight = await this.analyze(rawText, context);
    if (!insight) return { insight: null, response: { responseText: "عذراً، حدث خطأ تقني في معالجة الوعي." } };

    const response = await this.generateResponse(insight);
    return { insight, response };
}

}

export default LinguisticBrain;
