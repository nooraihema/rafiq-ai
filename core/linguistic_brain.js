
// /core/linguistic_brain_v4.js
// LinguisticBrain v7.0 - Knowledge-Augmented Intelligence (RAG)
// ============================================================

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';
import { AttentionLayer } from './attention_layer.js';
import { ReasoningEngine } from './reasoning_engine.js';
import { KnowledgeEngine } from './knowledge_engine.js'; // الاستيراد الجديد

export class LinguisticBrain {
    constructor(memorySystem, opts = {}) {
        console.log("%c🧠 [Constructor] Creating LinguisticBrain v7.0 (Encyclopedic)...", "color: #2196F3; font-weight: bold;");
        this.memory = memorySystem;
        this.dictionaries = {};
        this.engines = {};
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;
        console.log("%c🧠 Brain Initialization Started (Version 7.0)", "color: #4CAF50; font-weight: bold;");

        // 1. تحميل كل القواميس (نفس المنطق السابق)
        const dictFiles = ['affixes', 'psychological_concepts_engine', 'intensity_analyzer', 'generative_responses_engine', 'stop_words', 'emotional_anchors', 'psychological_patterns_hyperreal', 'emotional_dynamics_engine', 'behavior_values_defenses'];
        for (const key of dictFiles) {
            const mod = await import(`../dictionaries/${key}.js`);
            this.dictionaries[key] = mod.default || mod;
        }

        // 2. بناء المحركات بالهيكل الجديد
        try {
            this.engines.attention = new AttentionLayer({
                anchors: this.dictionaries.emotional_anchors?.EMOTIONAL_DICTIONARY || this.dictionaries.emotional_anchors,
                concepts: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP || {},
                stopWords: this.dictionaries.stop_words || new Set()
            });

            this.engines.semantic = new SemanticEngine({
                CONCEPT_MAP: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP,
                CONCEPT_DEFINITIONS: this.dictionaries.psychological_concepts_engine?.CONCEPT_DEFINITIONS,
                AFFIX_DICTIONARY: this.dictionaries.affixes
            });

            this.engines.emotion = new EmotionEngine({
                EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors,
                INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer,
                AFFIX_DICTIONARY: this.dictionaries.affixes
            });

            this.engines.synthesis = new SynthesisEngine({
                PATTERNS: this.dictionaries.psychological_patterns_hyperreal,
                BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses
            });

            this.engines.reasoning = new ReasoningEngine(this.memory);

            // [الجديد]: تهيئة أمين المكتبة
            this.engines.knowledge = new KnowledgeEngine();

            this.engines.catharsis = new CatharsisEngine(
                { 
                    GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine,
                    EMOTIONAL_DYNAMICS: this.dictionaries.emotional_dynamics_engine,
                    PATTERNS: this.dictionaries.psychological_patterns_hyperreal
                },
                {},
                this.memory
            );

            console.log("%c   🎉 STRATEGIC & CLINICAL PIPELINE ONLINE", "color: #4CAF50; font-weight: bold;");
        } catch (e) { console.error("❌ Brain Init Failed:", e); throw e; }

        this._isInitialized = true;
        return this;
    }

    async analyze(rawText, context = {}) {
        const start = Date.now();
        const tokens = tokenize(normalizeArabic(rawText.toLowerCase()));

        // [Phase 0]: الانتباه
        const attentionResult = await this.engines.attention.process(tokens);
        const attentionMap = attentionResult.salienceMap;

        // [Phase 1]: التحليل الدلالي والعاطفي
        const [semanticMap, emotionProfile] = await Promise.all([
            this.engines.semantic.analyze(rawText, { ...context, attentionMap }),
            this.engines.emotion.analyze(rawText, { ...context, attentionMap })
        ]);

        // [Phase 2]: التركيب النفسي
        const synthesisProfile = await this.engines.synthesis.analyze({ semanticMap, emotionProfile });

        // [Phase 3]: الاستدلال الاستراتيجي
        const strategicInsight = await this.engines.reasoning.computeStrategicInsight({
            emotionProfile, semanticMap, attentionMap, synthesisProfile
        });

        // [Phase 3.5]: استشارة المكتبة السريرية (الخطوة الجديدة)
        const clinicalInsights = await this.engines.knowledge.consultLibrary({
            semanticMap,
            attentionMap
        });

        return { 
            rawText, semanticMap, emotionProfile, synthesisProfile, strategicInsight,
            clinicalInsights, // إرسال "حزمة الحكمة" للرد
            _meta: { duration: Date.now() - start } 
        };
    }

    async generateResponse(insight) {
        console.log("%c[Pipeline 4] Engineering Soulful Clinical Response...", "color: #9C27B0; font-weight: bold;");
        const response = await this.engines.catharsis.generateResponse(insight);
        return response;
    }

    async process(rawText, context = {}) {
        const insight = await this.analyze(rawText, context);
        if (!insight) return { insight: null, response: { responseText: "خطأ في المعالجة." } };
        const response = await this.generateResponse(insight);
        return { insight, response };
    }
}
export default LinguisticBrain;
