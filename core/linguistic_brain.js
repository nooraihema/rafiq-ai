
// /core/linguistic_brain_v4.js
// LinguisticBrain v5.0 - Attention-Aware Intelligence
// ============================================================

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';
import { AttentionLayer } from './attention_layer.js'; // استيراد طبقة الانتباه

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
    console.log("%c🧠 [Constructor] Creating LinguisticBrain v5.0 (Attention Ready)...", "color: #2196F3; font-weight: bold;");
    this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
    this.memory = memorySystem;
    this.dictionaries = {};
    this.engines = {};
    this._isInitialized = false;
}

async init(manualProtocols = null) {
    if (this._isInitialized) return this;

    console.log("%c=======================================", "color: #4CAF50");
    console.log("%c🧠 Brain Initialization Started", "color: #4CAF50; font-weight: bold;");
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

    // --- الخطوة 3: بناء المحركات مع دمج طبقة الانتباه ---
    try {
        // 1. تهيئة طبقة الانتباه النفسي
        this.engines.attention = new AttentionLayer({
            anchors: this.dictionaries.emotional_anchors?.EMOTIONAL_DICTIONARY || this.dictionaries.emotional_anchors,
            concepts: semanticConfig.CONCEPT_MAP,
            stopWords: semanticConfig.STOP_WORDS_SET
        });

        // 2. تهيئة المحركات الأساسية
        this.engines.semantic = new SemanticEngine(semanticConfig);
        this.engines.emotion = new EmotionEngine({
            EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors || {},
            INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer || {},
            AFFIX_DICTIONARY: semanticConfig.AFFIX_DICTIONARY
        });
        this.engines.synthesis = new SynthesisEngine({
            PATTERNS: this.dictionaries.psychological_patterns_hyperreal || {},
            BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses || {}
        });
        this.engines.catharsis = new CatharsisEngine(
            { 
                GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine || {},
                EMOTIONAL_DYNAMICS: this.dictionaries.emotional_dynamics_engine || {} 
            },
            {},
            this.memory
        );

        console.log("%c   🎉 BRAIN & ATTENTION LAYER ONLINE", "color: #4CAF50; font-weight: bold;");
    } catch (e) {
        console.error("❌ Initialization Failed:", e);
        throw e;
    }

    this._isInitialized = true;
    return this;
}

/**
 * دالة التحليل العميق: تمر الجملة عبر "بوابة الانتباه" أولاً
 */
async analyze(rawText, context = {}) {
    if (!this._isInitialized) return null;
    
    console.log("\n" + "%c🚀 Starting Analysis Pipeline (v5.0)".repeat(1), "color: #fff; background: #2196F3; padding: 3px;");
    const start = Date.now();

    try {
        const normalized = normalizeArabic(rawText.toLowerCase());
        const tokens = tokenize(normalized);

        // [Phase 0]: تشغيل طبقة الانتباه لتحديد بؤرة التركيز
        // نمرر التوكنز لطبقة الانتباه لتعطينا "خريطة الأهمية" (Salience Map)
        const attentionResult = await this.engines.attention.process(tokens);
        const attentionMap = attentionResult.salienceMap;

        // [Phase 1]: التحليل الدلالي (نمرر خريطة الانتباه)
        const semanticMap = await this.engines.semantic.analyze(rawText, { ...context, attentionMap });

        // [Phase 2]: التحليل العاطفي (نمرر خريطة الانتباه)
        const emotionProfile = await this.engines.emotion.analyze(rawText, { ...context, attentionMap });

        // [Phase 3]: التركيب والاستنتاج
        const synthesisProfile = await this.engines.synthesis.analyze({ semanticMap, emotionProfile });

        return { 
            rawText, 
            semanticMap, 
            emotionProfile, 
            synthesisProfile, 
            attentionMap, // تصدير الخريطة للمعاينة
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
        console.log("%c[Pipeline 4] Generating Soulful Response...", "color: #9C27B0; font-weight: bold;");
        const response = await this.engines.catharsis.generateResponse(insight);
        
        // منطق عرض الـ DNA (Robust)
        let dnaDisplayName = "standard";
        if (response.emotionalDNA) {
            dnaDisplayName = Array.isArray(response.emotionalDNA) 
                ? response.emotionalDNA.join(', ') 
                : (response.emotionalDNA.name || "dynamic_model");
        }

        console.log(`🎯 Intent: %c${response.intent || 'insight_delivery'}`, "color: #FF5722; font-weight: bold;");
        console.log(`🧬 DNA Mix: %c${dnaDisplayName}`, "color: #FF5722; font-weight: bold;");
        
        return response;
    } catch (error) {
        console.error("❌ Response Generation Error:", error);
        return { responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك." };
    }
}

async process(rawText, context = {}) {
    const insight = await this.analyze(rawText, context);
    if (!insight) return { insight: null, response: { responseText: "عذراً، حدث خطأ تقني." } };

    const response = await this.generateResponse(insight);
    return { insight, response };
}

}

export default LinguisticBrain;
